import { Hono } from 'hono';
import { randomUUID } from 'crypto';
import { hashIp } from '../services/ip-hash.js';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { agents, pointTransactions, opinions, markets, profileAnswers, consentRecords, consentVersions, pendingDeletions } from '../db/schema.js';
import { eq, desc, and, lt } from 'drizzle-orm';
import { authMiddleware } from '../middleware/auth.js';
import { safeJsonParse } from '../utils.js';
import { EMPTY_MARKET_CONTEXT, normalizeContextForResponse } from '../services/context.js';
import { profileQuestions, requiredGenesisKeys } from '../db/profile-questions.js';
import { getObjective } from '../db/objectives.js';
import { computeAgentStats } from '../services/agent-stats.js';
import { deleteAgentCascade } from '../services/agent-deletion.js';
import { clearConsentVersionCache } from '../middleware/consentGate.js';
import logger from '../logger.js';

const DELETE_CONFIRM_TTL_MS = 24 * 60 * 60 * 1000;

function clientIpFrom(c: any): string {
  return (
    c.req.header('x-forwarded-for')?.split(',')[0]?.trim() ||
    c.req.header('x-real-ip') ||
    'unknown'
  );
}

export const agentRoutes = new Hono();

agentRoutes.post('/register', async (c) => {
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }
  const { handle, consent_version, email, retention_days } = body;

  if (!handle || typeof handle !== 'string') {
    return c.json({ error: 'handle is required' }, 400);
  }

  // Consent gate: registration requires explicit acceptance of the current ToS/Privacy.
  // GET /consent/current returns the version string clients should send.
  const gateEnabled = process.env.CONSENT_GATE_ENABLED !== 'false';
  let acceptedVersion: string | null = null;
  if (gateEnabled) {
    if (!consent_version || typeof consent_version !== 'string') {
      return c.json({
        error: 'consent_version is required',
        action: 'GET /consent/current to fetch the current version, then resubmit',
      }, 400);
    }
    const currentRows = await db
      .select({ version: consentVersions.version })
      .from(consentVersions)
      .where(eq(consentVersions.is_current, 1));
    const current = currentRows[0]?.version;
    if (!current) {
      return c.json({ error: 'Server consent configuration missing' }, 503);
    }
    if (consent_version !== current) {
      return c.json({
        error: 'consent_version is out of date',
        required_consent_version: current,
        tos_url: '/terms',
        privacy_url: '/privacy',
      }, 400);
    }
    acceptedVersion = current;
  }

  if (email !== undefined && email !== null) {
    if (typeof email !== 'string' || email.length > 254 || !email.includes('@')) {
      return c.json({ error: 'email must be a valid email address (max 254 chars)' }, 400);
    }
  }
  if (retention_days !== undefined && retention_days !== null) {
    if (typeof retention_days !== 'number' || !Number.isInteger(retention_days) || retention_days < 1 || retention_days > 3650) {
      return c.json({ error: 'retention_days must be an integer between 1 and 3650' }, 400);
    }
  }

  const MAX_AGENTS = parseInt(process.env.MAX_AGENTS || '30');
  const allAgents = await db.select({ id: agents.id, is_active: agents.is_active, expires_at: agents.expires_at }).from(agents);
  const now = Date.now();
  const activeCount = allAgents.filter(a => a.is_active !== 0 && !(a.expires_at && new Date(a.expires_at).getTime() <= now)).length;
  if (activeCount >= MAX_AGENTS) {
    return c.json({
      error: 'Registration is currently closed',
      message: `This experiment is capped at ${MAX_AGENTS} agents. All spots are filled.`,
    }, 403);
  }

  const existing = await db.select().from(agents).where(eq(agents.handle, handle));
  if (existing.length > 0) {
    return c.json({ error: 'Handle already taken' }, 409);
  }

  const id = randomUUID();
  const apiKey = randomUUID();
  const apiKeyHash = await bcrypt.hash(apiKey, 10);
  const nowIso = new Date().toISOString();

  await db.insert(agents).values({
    id,
    handle,
    api_key_hash: apiKeyHash,
    points_balance: 0,
    created_at: nowIso,
    agent_type: 'human',
    consent_version: acceptedVersion,
    consented_at: acceptedVersion ? nowIso : null,
    email: email ?? null,
    retention_days: retention_days ?? null,
  });

  if (acceptedVersion) {
    await db.insert(consentRecords).values({
      id: randomUUID(),
      agent_id: id,
      consent_version: acceptedVersion,
      accepted_at: nowIso,
      ip_hash: hashIp(clientIpFrom(c), acceptedVersion),
      user_agent: (c.req.header('user-agent') ?? '').slice(0, 500),
    });
  }

  return c.json({ agent_id: id, api_key: apiKey, handle, consent_version: acceptedVersion }, 201);
});

// POST /agents/me/consent — accept the current consent version (lifts a 426 from consentGate).
agentRoutes.post('/me/consent', authMiddleware, async (c) => {
  const agent = (c as any).get('agent') as { id: string };
  if (agent.id === '__admin__') return c.json({ error: 'Admin token cannot accept consent' }, 400);

  let body: any = {};
  try { body = await c.req.json(); } catch { /* allow empty body — reaccept current */ }

  const currentRows = await db
    .select({ version: consentVersions.version })
    .from(consentVersions)
    .where(eq(consentVersions.is_current, 1));
  const current = currentRows[0]?.version;
  if (!current) return c.json({ error: 'Server consent configuration missing' }, 503);

  if (body.consent_version && body.consent_version !== current) {
    return c.json({
      error: 'consent_version is out of date',
      required_consent_version: current,
    }, 400);
  }

  const nowIso = new Date().toISOString();
  await db.update(agents).set({ consent_version: current, consented_at: nowIso }).where(eq(agents.id, agent.id));
  await db.insert(consentRecords).values({
    id: randomUUID(),
    agent_id: agent.id,
    consent_version: current,
    accepted_at: nowIso,
    ip_hash: hashIp(clientIpFrom(c), current),
    user_agent: (c.req.header('user-agent') ?? '').slice(0, 500),
  });
  clearConsentVersionCache();

  return c.json({ agent_id: agent.id, consent_version: current, consented_at: nowIso });
});

// DELETE /agents/me — request hard-delete; returns a confirm_token valid for 24h.
// The actual data wipe happens on POST /agents/me/delete-confirm.
agentRoutes.delete('/me', authMiddleware, async (c) => {
  const agent = (c as any).get('agent') as { id: string };
  if (agent.id === '__admin__') return c.json({ error: 'Admin token cannot self-delete; use DELETE /admin/api/agents/:id' }, 400);

  const nowIso = new Date().toISOString();
  const expiresIso = new Date(Date.now() + DELETE_CONFIRM_TTL_MS).toISOString();
  const tokenId = randomUUID();

  await db.update(agents).set({ deletion_requested_at: nowIso }).where(eq(agents.id, agent.id));
  await db.insert(pendingDeletions).values({
    id: tokenId,
    agent_id: agent.id,
    expires_at: expiresIso,
    created_at: nowIso,
  });

  logger.info({ agentId: agent.id }, 'Self-serve deletion requested');
  return c.json(
    {
      agent_id: agent.id,
      deletion_requested_at: nowIso,
      confirm_token: tokenId,
      expires_at: expiresIso,
      action: 'POST /agents/me/delete-confirm with { confirm_token } within 24h',
    },
    202,
  );
});

// POST /agents/me/delete-confirm — runs the hard-delete cascade.
agentRoutes.post('/me/delete-confirm', authMiddleware, async (c) => {
  const agent = (c as any).get('agent') as { id: string };
  if (agent.id === '__admin__') return c.json({ error: 'Admin token cannot self-delete' }, 400);

  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }
  const { confirm_token } = body;
  if (!confirm_token || typeof confirm_token !== 'string') {
    return c.json({ error: 'confirm_token is required' }, 400);
  }

  // Lazy cleanup of expired tokens (cheap, runs only on confirm path)
  await db.delete(pendingDeletions).where(lt(pendingDeletions.expires_at, new Date().toISOString()));

  const tokenRows = await db
    .select()
    .from(pendingDeletions)
    .where(eq(pendingDeletions.id, confirm_token));
  const token = tokenRows[0];
  if (!token || token.agent_id !== agent.id) {
    return c.json({ error: 'Invalid or expired confirm_token' }, 400);
  }
  if (new Date(token.expires_at).getTime() <= Date.now()) {
    return c.json({ error: 'confirm_token has expired; request a new one via DELETE /agents/me' }, 400);
  }

  const deleted = await deleteAgentCascade(agent.id);
  logger.info({ agentId: deleted.id, handle: deleted.handle }, 'Self-serve deletion confirmed and executed');
  return c.json({ deleted: { id: deleted.id, handle: deleted.handle }, status: 'hard_deleted' });
});

// GET /agents/profile-questions — list profile questions (public)
agentRoutes.get('/profile-questions', async (c) => {
  const phase = c.req.query('phase') || 'genesis';
  const filtered = phase === 'all'
    ? profileQuestions
    : profileQuestions.filter(q => q.phase === phase);

  return c.json({
    questions: filtered.map(q => ({
      key: q.key,
      text: q.text,
      category: q.category,
      answer_type: q.answer_type,
      max_length: q.max_length,
      required: q.required,
      phase: q.phase,
    })),
  });
});

// GET /agents/objective/:index — get objective function for an agent index (public)
agentRoutes.get('/objective/:index', async (c) => {
  const raw = c.req.param('index');
  const index = parseInt(raw, 10);
  if (isNaN(index) || index < 0) {
    return c.json({ error: 'index must be a non-negative integer' }, 400);
  }
  return c.json({ index, objective: getObjective(index) });
});

// POST /agents/profile — submit or update profile answers (upsert)
agentRoutes.post('/profile', authMiddleware, async (c) => {
  const agent = (c as any).get('agent') as { id: string };
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }

  const { answers } = body;
  if (!Array.isArray(answers) || answers.length === 0) {
    return c.json({ error: 'answers must be a non-empty array of { question_key, answer }' }, 400);
  }

  const questionsByKey = new Map(profileQuestions.map(q => [q.key, q]));
  const errors: string[] = [];

  for (const entry of answers) {
    if (!entry.question_key || typeof entry.question_key !== 'string') {
      errors.push('Each answer must have a question_key string');
      continue;
    }
    const question = questionsByKey.get(entry.question_key);
    if (!question) {
      errors.push(`Unknown question_key: ${entry.question_key}`);
      continue;
    }
    if (!entry.answer || typeof entry.answer !== 'string') {
      errors.push(`${entry.question_key}: answer must be a non-empty string`);
      continue;
    }
    if (entry.answer.length > question.max_length) {
      errors.push(`${entry.question_key}: answer exceeds max length of ${question.max_length} characters`);
      continue;
    }
  }

  if (errors.length > 0) {
    return c.json({ error: 'Validation failed', details: errors }, 400);
  }

  const now = new Date().toISOString();
  let saved = 0;

  for (const entry of answers) {
    const question = questionsByKey.get(entry.question_key)!;
    const existing = await db.select().from(profileAnswers).where(
      and(eq(profileAnswers.agent_id, agent.id), eq(profileAnswers.question_key, entry.question_key))
    );

    if (existing.length > 0) {
      await db.update(profileAnswers)
        .set({ answer: entry.answer, question_version: question.version, updated_at: now })
        .where(eq(profileAnswers.id, existing[0].id));
    } else {
      await db.insert(profileAnswers).values({
        id: randomUUID(),
        agent_id: agent.id,
        question_key: entry.question_key,
        answer: entry.answer,
        question_version: question.version,
        created_at: now,
        updated_at: now,
      });
    }
    saved++;
  }

  // Check completion status
  const allAnswers = await db.select().from(profileAnswers).where(eq(profileAnswers.agent_id, agent.id));
  const answeredKeys = new Set(allAnswers.map(a => a.question_key));
  const missingRequired = requiredGenesisKeys.filter(k => !answeredKeys.has(k));

  return c.json({
    agent_id: agent.id,
    profile_complete: missingRequired.length === 0,
    answers_saved: saved,
    missing_required: missingRequired,
  }, 200);
});

agentRoutes.get('/:id/balance', authMiddleware, async (c) => {
  const agentId = c.req.param('id')!;
  const authenticatedAgent = (c as any).get('agent') as { id: string };
  const adminKey = process.env.ADMIN_API_KEY || 'local-admin-key';
  const authHeader = c.req.header('Authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const isAdmin = bearerToken === adminKey;

  if (authenticatedAgent.id !== agentId && !isAdmin) {
    return c.json({ error: 'Forbidden: you can only view your own balance' }, 403);
  }

  const agent = await db.select().from(agents).where(eq(agents.id, agentId));

  if (agent.length === 0) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const transactions = await db.select().from(pointTransactions).where(eq(pointTransactions.agent_id, agentId));

  return c.json({
    agent_id: agent[0].id,
    handle: agent[0].handle,
    points_balance: agent[0].points_balance,
    transactions,
  });
});

// GET /agents/:id/history — opinion history with outcomes (owner or admin)
agentRoutes.get('/:id/history', authMiddleware, async (c) => {
  const agentId = c.req.param('id')!;
  const authenticatedAgent = (c as any).get('agent') as { id: string };
  const adminKey = process.env.ADMIN_API_KEY || 'local-admin-key';
  const authHeader = c.req.header('Authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const isAdmin = bearerToken === adminKey;

  if (authenticatedAgent.id !== agentId && !isAdmin) {
    return c.json({ error: 'Forbidden: you can only view your own history' }, 403);
  }

  const page = parseInt(c.req.query('page') || '1');
  const limit = parseInt(c.req.query('limit') || '20');
  const offset = (page - 1) * limit;

  const agentOpinions = await db
    .select()
    .from(opinions)
    .where(eq(opinions.agent_id, agentId))
    .orderBy(desc(opinions.created_at));

  const total = agentOpinions.length;
  const paginated = agentOpinions.slice(offset, offset + limit);

  const history = await Promise.all(
    paginated.map(async (op) => {
      const marketRows = await db.select().from(markets).where(eq(markets.id, op.market_id));
      const market = marketRows[0];
      const payouts = await db
        .select()
        .from(pointTransactions)
        .where(eq(pointTransactions.market_id, op.market_id));
      const agentPayouts = payouts.filter((p) => p.agent_id === agentId);
      const pointsEarned = agentPayouts.reduce((sum, p) => sum + p.amount, 0);

      return {
        market_id: op.market_id,
        question: market?.question ?? 'Unknown',
        agent_answer: op.answer,
        majority_position: market?.majority_position ?? null,
        market_status: market?.status ?? 'unknown',
        points_earned: pointsEarned,
        provenance_score: op.provenance_score ?? null,
        provenance: op.provenance_json ? safeJsonParse(op.provenance_json, null) : null,
        expressed_at: op.created_at,
      };
    }),
  );

  return c.json({ history, page, limit, total });
});

// GET /agents/:id/markets — maker portfolio (markets created by this agent)
agentRoutes.get('/:id/markets', authMiddleware, async (c) => {
  const agentId = c.req.param('id')!;

  const agentMarkets = await db
    .select()
    .from(markets)
    .where(eq(markets.created_by, agentId))
    .orderBy(desc(markets.created_at));

  const parsed = agentMarkets.map((m) => {
    const { context_json, answer_options, ...rest } = m;
    return {
      ...rest,
      context: normalizeContextForResponse(safeJsonParse(context_json, EMPTY_MARKET_CONTEXT)),
      answer_options: answer_options ? safeJsonParse<string[] | null>(answer_options, null) : null,
    };
  });

  return c.json({ markets: parsed });
});

// PUT /agents/:id/profile — update agent profile metadata
agentRoutes.put('/:id/profile', authMiddleware, async (c) => {
  const agentId = c.req.param('id')!;
  const authenticatedAgent = (c as any).get('agent') as { id: string };

  if (authenticatedAgent.id !== agentId) {
    return c.json({ error: 'Forbidden: you can only update your own profile' }, 403);
  }

  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }

  const { bio, avatar_url, description, location_country, location_region, location_city } = body;

  if (bio !== undefined && (typeof bio !== 'string' || bio.length > 500)) {
    return c.json({ error: 'bio must be a string of 500 characters or fewer' }, 400);
  }
  if (avatar_url !== undefined && (typeof avatar_url !== 'string' || avatar_url.length > 2000)) {
    return c.json({ error: 'avatar_url must be a valid URL string' }, 400);
  }
  if (description !== undefined && (typeof description !== 'string' || description.length > 200)) {
    return c.json({ error: 'description must be a string of 200 characters or fewer' }, 400);
  }
  if (location_country !== undefined && (typeof location_country !== 'string' || location_country.length !== 2)) {
    return c.json({ error: 'location_country must be a 2-character ISO 3166-1 alpha-2 code' }, 400);
  }
  if (location_region !== undefined && (typeof location_region !== 'string' || location_region.length > 100)) {
    return c.json({ error: 'location_region must be a string of 100 characters or fewer' }, 400);
  }
  if (location_city !== undefined && (typeof location_city !== 'string' || location_city.length > 100)) {
    return c.json({ error: 'location_city must be a string of 100 characters or fewer' }, 400);
  }

  const updates: Record<string, string> = {};
  if (bio !== undefined) updates.bio = bio;
  if (avatar_url !== undefined) updates.avatar_url = avatar_url;
  if (description !== undefined) updates.description = description;
  if (location_country !== undefined) updates.location_country = location_country.toUpperCase();
  if (location_region !== undefined) updates.location_region = location_region;
  if (location_city !== undefined) updates.location_city = location_city;

  if (Object.keys(updates).length === 0) {
    return c.json({ error: 'No fields to update' }, 400);
  }

  await db.update(agents).set(updates).where(eq(agents.id, agentId));
  const updated = await db.select().from(agents).where(eq(agents.id, agentId));

  return c.json({
    agent_id: updated[0].id,
    handle: updated[0].handle,
    bio: updated[0].bio ?? null,
    avatar_url: updated[0].avatar_url ?? null,
    description: updated[0].description ?? null,
    location_country: updated[0].location_country ?? null,
    location_region: updated[0].location_region ?? null,
    location_city: updated[0].location_city ?? null,
  });
});

// GET /agents/:id/profile — computed participation profile
agentRoutes.get('/:id/profile', authMiddleware, async (c) => {
  const agentId = c.req.param('id')!;
  const authenticatedAgent = (c as any).get('agent') as { id: string };

  const adminKey = process.env.ADMIN_API_KEY || 'local-admin-key';
  const authHeader = c.req.header('Authorization') || '';
  const bearerToken = authHeader.startsWith('Bearer ') ? authHeader.slice(7) : '';
  const isAdmin = bearerToken === adminKey;

  if (authenticatedAgent.id !== agentId && !isAdmin) {
    return c.json({ error: 'Forbidden: you can only view your own profile' }, 403);
  }

  const stats = await computeAgentStats(agentId);
  if (!stats) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  // Fetch self-reported profile data
  const profileData = await db.select().from(profileAnswers).where(eq(profileAnswers.agent_id, agentId));
  const answeredKeys = new Set(profileData.map(a => a.question_key));
  const profileComplete = requiredGenesisKeys.every(k => answeredKeys.has(k));

  let selfReported: Record<string, unknown> | null = null;
  if (profileData.length > 0) {
    const answers: Record<string, string> = {};
    let lastUpdated = '';
    for (const row of profileData) {
      answers[row.question_key] = row.answer;
      if (row.updated_at > lastUpdated) lastUpdated = row.updated_at;
    }
    selfReported = { ...answers, last_updated: lastUpdated };
  }

  return c.json({
    ...stats,
    profile_complete: profileComplete,
    self_reported: selfReported,
  });
});

// GET /agents/:id/stats — aggregated participation stats
agentRoutes.get('/:id/stats', authMiddleware, async (c) => {
  const agentId = c.req.param('id')!;

  const agentRows = await db.select().from(agents).where(eq(agents.id, agentId));
  if (agentRows.length === 0) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const agentOpinions = await db
    .select()
    .from(opinions)
    .where(eq(opinions.agent_id, agentId));

  let resolvedCount = 0;

  for (const op of agentOpinions) {
    const marketRows = await db.select().from(markets).where(eq(markets.id, op.market_id));
    if (marketRows[0]?.status === 'resolved') {
      resolvedCount++;
    }
  }

  return c.json({
    agent_id: agentId,
    handle: agentRows[0].handle,
    total_opinions: agentOpinions.length,
    markets_participated: resolvedCount,
    points_earned: agentRows[0].points_balance,
  });
});
