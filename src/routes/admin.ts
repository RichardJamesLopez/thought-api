import { Hono } from 'hono';
import { randomUUID } from 'crypto';
import { db, sqlite } from '../db/index.js';
import { markets, opinions, pointTransactions, agents, marketAttachments, synthesisDeliverables } from '../db/schema.js';
import { deleteAgentCascade } from '../services/agent-deletion.js';
import { eq, like, or, sql, and, asc, desc, isNotNull } from 'drizzle-orm';
import { adminAuthMiddleware } from '../middleware/auth.js';
import { tallyMarket } from '../services/resolution.js';
import { distributeRewards } from '../services/points.js';
import { runBulkExpress, runBulkCreateMarkets } from '../services/bulk-express.js';
import { validateResponseConstraints, validateAnswerOptions, validateMarketQuestion, validateMarketDescription, validateMarketContext, validateScaleConfig } from '../services/validation.js';
import type { CreateMarketBody, ResponseConstraints } from '../types.js';
import { PLATFORM_TREASURY_ID, VALID_CATEGORIES } from '../types.js';
import { ensureUpcomingSessions, getSessionById, nextSessionOrder } from '../services/sessions.js';
import { normalizeContextForStorage } from '../services/context.js';
import { getDefaultMarketFunding, getMaxAdminMarketFunding } from '../utils.js';
import logger from '../logger.js';

export const adminRoutes = new Hono();

// All admin routes require admin auth
adminRoutes.use('/*', adminAuthMiddleware);

// POST /admin/api/markets - create market with rich context
adminRoutes.post('/markets', async (c) => {
  let body: CreateMarketBody;
  try { body = await c.req.json<CreateMarketBody>(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }
  const {
    question, description, context, category, deadline,
    answer_type, answer_options, response_constraints,
    max_participants, tags, reward_amount, delay_hours, scheduled_start,
    session_date, session_slot,
  } = body;

  if (!question || !description || !context || !category) {
    return c.json({ error: 'Missing required fields: question, description, context, category' }, 400);
  }

  if (!(VALID_CATEGORIES as readonly string[]).includes(category)) {
    return c.json({ error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` }, 400);
  }

  // Validate answer type and options/constraints
  const marketAnswerType = answer_type || 'binary';
  const validAnswerTypes = ['binary', 'single_choice', 'multi_choice', 'longform', 'ranking', 'scale'];
  if (!validAnswerTypes.includes(marketAnswerType)) {
    return c.json({ error: `answer_type must be one of: ${validAnswerTypes.join(', ')}` }, 400);
  }

  let sanitizedOptions: string[] | null = null;
  let sanitizedConstraints: ResponseConstraints | null = null;
  let sanitizedScaleConfig: { min: number; max: number } | null = null;

  if (marketAnswerType === 'longform') {
    if (answer_options) {
      return c.json({ error: 'Longform markets cannot have answer_options' }, 400);
    }
    if (!response_constraints) {
      return c.json({ error: 'Longform markets require response_constraints' }, 400);
    }
    const constraintValidation = validateResponseConstraints(response_constraints);
    if (!constraintValidation.valid) {
      return c.json({ error: constraintValidation.error }, 400);
    }
    sanitizedConstraints = constraintValidation.sanitized!;
  } else if (marketAnswerType === 'single_choice' || marketAnswerType === 'multi_choice' || marketAnswerType === 'ranking') {
    if (!answer_options) {
      return c.json({ error: `${marketAnswerType} markets require answer_options` }, 400);
    }
    const validation = validateAnswerOptions(answer_options);
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400);
    }
    if (marketAnswerType === 'ranking' && answer_options.length > 6) {
      return c.json({ error: 'Ranking markets support at most 6 options' }, 400);
    }
    sanitizedOptions = validation.sanitized!;
  } else if (marketAnswerType === 'scale') {
    if (!answer_options) {
      return c.json({ error: 'Scale markets require answer_options with { min, max } configuration' }, 400);
    }
    const scaleValidation = validateScaleConfig(answer_options);
    if (!scaleValidation.valid) {
      return c.json({ error: scaleValidation.error }, 400);
    }
    sanitizedScaleConfig = scaleValidation.sanitized!;
  } else {
    if (answer_options) {
      return c.json({ error: 'Binary markets cannot have answer_options. Use answer_type "single_choice" instead.' }, 400);
    }
  }

  // Validate max_participants
  if (max_participants !== undefined && max_participants !== null) {
    if (typeof max_participants !== 'number' || !Number.isInteger(max_participants) || max_participants < 1) {
      return c.json({ error: 'max_participants must be a positive integer' }, 400);
    }
  }

  // Validate tags
  let sanitizedTags: string[] | null = null;
  if (tags !== undefined && tags !== null) {
    if (!Array.isArray(tags)) {
      return c.json({ error: 'tags must be an array of strings' }, 400);
    }
    if (tags.length > 10) {
      return c.json({ error: 'tags must have at most 10 items' }, 400);
    }
    for (const tag of tags) {
      if (typeof tag !== 'string' || tag.trim().length === 0 || tag.trim().length > 50) {
        return c.json({ error: 'Each tag must be a non-empty string of 50 characters or fewer' }, 400);
      }
    }
    sanitizedTags = tags.map(t => t.trim());
  }

  const defaultFunding = getDefaultMarketFunding();
  const rewardAmount = reward_amount == null ? defaultFunding : reward_amount;

  // Validate reward_amount
  const maxAdminFunding = getMaxAdminMarketFunding();
  if (typeof rewardAmount !== 'number' || !Number.isInteger(rewardAmount) || rewardAmount < 1) {
    return c.json({ error: 'reward_amount must be a positive integer' }, 400);
  }
  if (rewardAmount > maxAdminFunding) {
    return c.json({ error: `reward_amount must be at most ${maxAdminFunding}` }, 400);
  }

  // Resolve scheduling: either explicit session slot (preferred) or legacy delay/scheduled_start/deadline
  let computedScheduledStart: string | null = null;
  let computedDeadline: string;
  let computedSessionId: string | null = null;
  let computedSessionOrder: number | null = null;
  let marketStatus = 'open';

  if (session_date || session_slot) {
    if (!session_date || !session_slot) {
      return c.json({ error: 'session_date and session_slot must be provided together' }, 400);
    }
    if (!/^\d{4}-\d{2}-\d{2}$/.test(session_date)) {
      return c.json({ error: 'session_date must use YYYY-MM-DD format' }, 400);
    }
    if (session_slot !== 'AM' && session_slot !== 'PM') {
      return c.json({ error: 'session_slot must be "AM" or "PM"' }, 400);
    }

    const [year, month, day] = session_date.split('-').map(Number);
    const targetMiddayUtc = Date.UTC(year, month - 1, day, 12, 0, 0);
    const now = new Date();
    const nowMiddayUtc = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate(), 12, 0, 0);
    const daysOut = Math.ceil((targetMiddayUtc - nowMiddayUtc) / (24 * 60 * 60 * 1000));
    ensureUpcomingSessions(Math.max(daysOut + 3, 2));

    const sessionId = `${session_date}-${session_slot}`;
    const session = getSessionById(sessionId);
    if (!session) {
      return c.json({ error: 'Selected session does not exist' }, 400);
    }
    if (session.status !== 'scheduled') {
      return c.json({ error: `Selected session is ${session.status}; only scheduled sessions are allowed` }, 400);
    }
    if (session.scheduled_start_utc <= now.toISOString()) {
      return c.json({ error: 'Selected session is in the past' }, 400);
    }

    computedScheduledStart = session.scheduled_start_utc;
    computedDeadline = session.deadline_utc;
    computedSessionId = session.id;
    computedSessionOrder = nextSessionOrder(session.id);
    marketStatus = 'scheduled';
  } else {
    if (!deadline) {
      return c.json({ error: 'deadline is required unless session_date and session_slot are provided' }, 400);
    }

    const parsedDeadline = new Date(deadline);
    if (isNaN(parsedDeadline.getTime())) {
      return c.json({ error: 'Invalid deadline format' }, 400);
    }
    computedDeadline = parsedDeadline.toISOString();

    if (delay_hours !== undefined && delay_hours !== null && delay_hours > 0) {
      computedScheduledStart = new Date(Date.now() + delay_hours * 3600000).toISOString();
      marketStatus = 'scheduled';
    } else if (scheduled_start) {
      const startDate = new Date(scheduled_start);
      if (isNaN(startDate.getTime())) {
        return c.json({ error: 'Invalid scheduled_start format' }, 400);
      }
      if (startDate.getTime() > Date.now()) {
        computedScheduledStart = startDate.toISOString();
        marketStatus = 'scheduled';
      }
    }
  }

  const id = randomUUID();
  const now = new Date().toISOString();

  // Apply take rate consistently (same as lifecycle and agent-funded markets)
  const takeRate = parseFloat(process.env.TAKE_RATE || '0.6');
  const platformFee = Math.floor(rewardAmount * takeRate);
  const netRewardPool = rewardAmount - platformFee;

  const normalizedContext = normalizeContextForStorage(context);

  await db.insert(markets).values({
    id,
    question,
    description,
    context_json: JSON.stringify(normalizedContext),
    category,
    status: marketStatus,
    created_by: 'admin',
    deadline: computedDeadline,
    created_at: now,
    answer_type: marketAnswerType,
    answer_options: sanitizedScaleConfig ? JSON.stringify(sanitizedScaleConfig) : sanitizedOptions ? JSON.stringify(sanitizedOptions) : null,
    response_constraints: sanitizedConstraints ? JSON.stringify(sanitizedConstraints) : null,
    max_participants: max_participants ?? null,
    tags: sanitizedTags ? JSON.stringify(sanitizedTags) : null,
    scheduled_start: computedScheduledStart,
    session_id: computedSessionId,
    session_order: computedSessionOrder,
    creator_type: 'admin',
    funded_amount: rewardAmount,
    platform_fee: platformFee,
    reward_pool: netRewardPool,
    reward_distributed: 0,
  });

  // Fund from treasury
  if (netRewardPool !== null && platformFee !== null) {
    // Record system funding transaction (full amount leaves treasury conceptually)
    await db.insert(pointTransactions).values({
      id: randomUUID(),
      agent_id: PLATFORM_TREASURY_ID,
      market_id: id,
      amount: -rewardAmount,
      type: 'system_funding',
      created_at: now,
    });

    // Record platform fee transaction
    await db.insert(pointTransactions).values({
      id: randomUUID(),
      agent_id: PLATFORM_TREASURY_ID,
      market_id: id,
      amount: platformFee,
      type: 'platform_fee',
      created_at: now,
    });

    // Deduct only net reward pool from treasury (platform fee stays)
    await db.update(agents)
      .set({ points_balance: sql`${agents.points_balance} - ${netRewardPool}` })
      .where(eq(agents.id, PLATFORM_TREASURY_ID));
  }

  return c.json({
    id,
    question,
    description,
    context: normalizedContext,
    category,
    status: marketStatus,
    created_by: 'admin',
    deadline: computedDeadline,
    created_at: now,
    answer_type: marketAnswerType,
    answer_options: sanitizedOptions,
    response_constraints: sanitizedConstraints,
    max_participants: max_participants ?? null,
    tags: sanitizedTags,
    reward_amount: rewardAmount,
    funded_amount: rewardAmount,
    platform_fee: platformFee,
    reward_pool: netRewardPool,
    scheduled_start: computedScheduledStart,
    session_id: computedSessionId,
    session_order: computedSessionOrder,
  }, 201);
});

// POST /admin/treasury/topup - add points to platform treasury
adminRoutes.post('/treasury/topup', async (c) => {
  let body: { amount?: number };
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }
  const { amount } = body;

  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1) {
    return c.json({ error: 'amount must be a positive integer' }, 400);
  }

  const maxTopup = 100000;
  if (amount > maxTopup) {
    return c.json({ error: `amount must be at most ${maxTopup}` }, 400);
  }

  const now = new Date().toISOString();

  await db.update(agents)
    .set({ points_balance: sql`${agents.points_balance} + ${amount}` })
    .where(eq(agents.id, PLATFORM_TREASURY_ID));

  await db.insert(pointTransactions).values({
    id: randomUUID(),
    agent_id: PLATFORM_TREASURY_ID,
    market_id: 'treasury_topup',
    amount,
    type: 'system_funding',
    created_at: now,
  });

  const updated = await db.select({ points_balance: agents.points_balance })
    .from(agents)
    .where(eq(agents.id, PLATFORM_TREASURY_ID));

  return c.json({
    treasury_balance: updated[0]?.points_balance ?? 0,
    amount_added: amount,
    timestamp: now,
  });
});

// GET /admin/api/markets/:id/raw-results — full per-agent disclosure (admin-only).
// The public /markets/:id/results endpoint redacts agent_id and basis under k-anonymity;
// this endpoint is the unredacted view for analytics/debugging behind admin auth.
adminRoutes.get('/markets/:id/raw-results', async (c) => {
  const marketId = c.req.param('id')!;

  const marketRows = await db.select().from(markets).where(eq(markets.id, marketId));
  if (marketRows.length === 0) {
    return c.json({ error: 'Market not found' }, 404);
  }
  const market = marketRows[0];

  const allOpinions = await db.select().from(opinions).where(eq(opinions.market_id, marketId));
  const allPayouts = await db.select().from(pointTransactions).where(eq(pointTransactions.market_id, marketId));
  const agentRows = await db.select({ id: agents.id, handle: agents.handle, agent_type: agents.agent_type }).from(agents);
  const agentMetaById = new Map(agentRows.map(a => [a.id, { handle: a.handle, agent_type: a.agent_type }]));

  const rows = allOpinions.map((op) => {
    const meta = agentMetaById.get(op.agent_id);
    const points = allPayouts.filter(p => p.agent_id === op.agent_id).reduce((s, p) => s + p.amount, 0);
    return {
      agent_id: op.agent_id,
      handle: meta?.handle ?? null,
      agent_type: meta?.agent_type ?? null,
      answer: op.answer,
      basis: op.basis ?? null,
      confidence: op.confidence ?? null,
      review_state: op.review_state ?? null,
      points,
      created_at: op.created_at,
    };
  });

  return c.json({
    market_id: marketId,
    question: market.question,
    answer_type: market.answer_type ?? 'binary',
    status: market.status,
    total_participants: rows.length,
    rows,
  });
});

// ── Longform PII review queue ──
// Longform answers from /express land here when the PII pipeline flags soft findings
// (LOCATION/ORG/OTHER). Hard PII (EMAIL/PHONE/SSN/CC/PERSON) is rejected at submit
// and never reaches the queue. Approved answers count toward aggregate results;
// rejected answers stay in the DB for audit but are excluded from results.

adminRoutes.get('/longform-queue', async (c) => {
  const status = (c.req.query('status') ?? 'pending').toLowerCase();
  if (status !== 'pending' && status !== 'approved' && status !== 'rejected' && status !== 'all') {
    return c.json({ error: 'status must be one of: pending | approved | rejected | all' }, 400);
  }
  const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10) || 50, 200);

  // Pending rows sort oldest-first so the most-overdue items bubble up; once a row
  // has been actioned (approved/rejected/all), newest-first is more useful for
  // audit review.
  const orderBy = status === 'pending' ? asc(opinions.created_at) : desc(opinions.created_at);
  const baseRows = await db
    .select()
    .from(opinions)
    .where(isNotNull(opinions.review_state))
    .orderBy(orderBy)
    .limit(limit * 2); // overfetch to allow status filter without a column-conditional query
  const filtered = status === 'all' ? baseRows : baseRows.filter(o => o.review_state === status);
  const rows = filtered.slice(0, limit);

  const marketIds = Array.from(new Set(rows.map(r => r.market_id)));
  const agentIds = Array.from(new Set(rows.map(r => r.agent_id)));
  const marketRows = marketIds.length
    ? await db.select({ id: markets.id, question: markets.question, answer_type: markets.answer_type }).from(markets).where(or(...marketIds.map(id => eq(markets.id, id))))
    : [];
  const agentRows = agentIds.length
    ? await db.select({ id: agents.id, handle: agents.handle, agent_type: agents.agent_type }).from(agents).where(or(...agentIds.map(id => eq(agents.id, id))))
    : [];
  const marketById = new Map(marketRows.map(m => [m.id, m]));
  const agentById = new Map(agentRows.map(a => [a.id, a]));

  return c.json({
    status,
    count: rows.length,
    items: rows.map(r => {
      const findings = r.pii_findings_json ? safeJsonParseLocal(r.pii_findings_json, null) : null;
      const market = marketById.get(r.market_id);
      const agent = agentById.get(r.agent_id);
      return {
        opinion_id: r.id,
        market_id: r.market_id,
        market_question: market?.question ?? null,
        market_answer_type: market?.answer_type ?? null,
        agent_id: r.agent_id,
        agent_handle: agent?.handle ?? null,
        agent_type: agent?.agent_type ?? null,
        review_state: r.review_state,
        answer: r.answer,
        redacted_answer: r.redacted_answer,
        pii_findings: findings,
        reviewer_id: r.reviewer_id,
        reviewed_at: r.reviewed_at,
        created_at: r.created_at,
      };
    }),
  });
});

adminRoutes.post('/longform/:id/approve', async (c) => {
  const opinionId = c.req.param('id');
  const reviewerId = (c as any).get('agent')?.id ?? '__admin__';
  const rows = await db.select().from(opinions).where(eq(opinions.id, opinionId));
  if (rows.length === 0) return c.json({ error: 'Opinion not found' }, 404);
  const op = rows[0];
  if (!op.review_state) return c.json({ error: 'Opinion is not subject to review' }, 400);
  if (op.review_state === 'approved') return c.json({ status: 'already_approved' });

  const now = new Date().toISOString();
  await db.update(opinions)
    .set({ review_state: 'approved', reviewer_id: reviewerId, reviewed_at: now })
    .where(eq(opinions.id, opinionId));
  logger.info({ opinionId, reviewerId }, 'Longform opinion approved');
  return c.json({ opinion_id: opinionId, review_state: 'approved', reviewed_at: now });
});

adminRoutes.post('/longform/:id/reject', async (c) => {
  const opinionId = c.req.param('id');
  const reviewerId = (c as any).get('agent')?.id ?? '__admin__';
  const rows = await db.select().from(opinions).where(eq(opinions.id, opinionId));
  if (rows.length === 0) return c.json({ error: 'Opinion not found' }, 404);
  const op = rows[0];
  if (!op.review_state) return c.json({ error: 'Opinion is not subject to review' }, 400);
  if (op.review_state === 'rejected') return c.json({ status: 'already_rejected' });

  const now = new Date().toISOString();
  await db.update(opinions)
    .set({ review_state: 'rejected', reviewer_id: reviewerId, reviewed_at: now })
    .where(eq(opinions.id, opinionId));
  logger.info({ opinionId, reviewerId }, 'Longform opinion rejected');
  return c.json({ opinion_id: opinionId, review_state: 'rejected', reviewed_at: now });
});

// ── Longform Question Review (funnel-generated longform drafts) ─────────────
// Pre-deploy review queue for longform QUESTIONS produced by the funnel scheduler.
// Distinct from the answer-side queue above: those are agent submissions awaiting
// PII clearance; these are LLM-generated questions awaiting editorial approval
// before they get scheduled into AM/PM sessions.

adminRoutes.get('/longform-question-queue', async (c) => {
  const status = (c.req.query('status') ?? 'draft').toLowerCase();
  if (!['draft', 'approved', 'rejected', 'deployed', 'all'].includes(status)) {
    return c.json({ error: 'status must be one of: draft | approved | rejected | deployed | all' }, 400);
  }
  const limit = Math.min(parseInt(c.req.query('limit') ?? '50', 10) || 50, 200);

  const where = status === 'all'
    ? "WHERE funnel_id IS NOT NULL AND answer_type = 'longform'"
    : "WHERE funnel_id IS NOT NULL AND answer_type = 'longform' AND status = ?";
  const order = status === 'draft' ? 'ASC' : 'DESC';

  const stmt = sqlite.prepare(`
    SELECT dq.id, dq.funnel_id, dq.question, dq.description, dq.category,
           dq.answer_type, dq.response_constraints, dq.status, dq.created_at, dq.updated_at,
           f.display_insight_name AS funnel_name
    FROM draft_questions dq
    LEFT JOIN research_funnels f ON f.id = dq.funnel_id
    ${where}
    ORDER BY dq.created_at ${order}
    LIMIT ?
  `);
  const rows = status === 'all' ? stmt.all(limit) : stmt.all(status, limit);
  return c.json({ status, count: rows.length, items: rows });
});

adminRoutes.post('/longform-question/:id/approve', async (c) => {
  const id = c.req.param('id');
  const draft = sqlite.prepare(`SELECT id, funnel_id, status, answer_type FROM draft_questions WHERE id = ?`).get(id) as any;
  if (!draft) return c.json({ error: 'Draft not found' }, 404);
  if (!draft.funnel_id) return c.json({ error: 'Draft is not funnel-sourced' }, 400);
  if (draft.answer_type !== 'longform') return c.json({ error: 'Only longform drafts use this queue' }, 400);
  if (draft.status === 'approved') return c.json({ status: 'already_approved' });
  if (draft.status !== 'draft') return c.json({ error: `Cannot approve a draft in status ${draft.status}` }, 400);

  const now = new Date().toISOString();
  sqlite.prepare(`UPDATE draft_questions SET status = 'approved', updated_at = ? WHERE id = ?`).run(now, id);
  logger.info({ draftId: id, funnelId: draft.funnel_id }, 'Funnel longform draft approved');
  return c.json({ draft_id: id, status: 'approved', updated_at: now });
});

adminRoutes.post('/longform-question/:id/reject', async (c) => {
  const id = c.req.param('id');
  const draft = sqlite.prepare(`SELECT id, funnel_id, status, answer_type FROM draft_questions WHERE id = ?`).get(id) as any;
  if (!draft) return c.json({ error: 'Draft not found' }, 404);
  if (!draft.funnel_id) return c.json({ error: 'Draft is not funnel-sourced' }, 400);
  if (draft.answer_type !== 'longform') return c.json({ error: 'Only longform drafts use this queue' }, 400);
  if (draft.status === 'rejected') return c.json({ status: 'already_rejected' });
  if (draft.status === 'deployed') return c.json({ error: 'Cannot reject a deployed draft' }, 400);

  const now = new Date().toISOString();
  sqlite.prepare(`UPDATE draft_questions SET status = 'rejected', updated_at = ? WHERE id = ?`).run(now, id);
  logger.info({ draftId: id, funnelId: draft.funnel_id }, 'Funnel longform draft rejected');
  return c.json({ draft_id: id, status: 'rejected', updated_at: now });
});

function safeJsonParseLocal<T>(raw: string, fallback: T): T {
  try { return JSON.parse(raw) as T; } catch { return fallback; }
}

// POST /admin/api/agents/bulk-express - trigger all eligible agents to express on open markets
// Must be registered BEFORE /:id routes to avoid param capture
adminRoutes.post('/agents/bulk-express', async (c) => {
  let body: { batch_size?: number; delay_ms?: number; dry_run?: boolean } = {};
  try { body = await c.req.json(); } catch { /* use defaults */ }

  logger.info({ dryRun: body.dry_run ?? false }, 'Bulk-express triggered');
  const result = await runBulkExpress(body);
  logger.info({ opinions: result.opinions_submitted, duration: result.duration_ms }, 'Bulk-express complete');

  return c.json(result);
});

// POST /admin/api/agents/bulk-create-markets - trigger agents to create domain-relevant markets
// Must be registered BEFORE /:id routes to avoid param capture
adminRoutes.post('/agents/bulk-create-markets', async (c) => {
  let body: { agent_filter?: string; markets_per_agent?: number; deadline_hours?: number; dry_run?: boolean } = {};
  try { body = await c.req.json(); } catch { /* use defaults */ }

  logger.info({ agentFilter: body.agent_filter, dryRun: body.dry_run ?? false }, 'Bulk-create-markets triggered');
  const result = await runBulkCreateMarkets(body);
  logger.info({ markets: result.markets_created, duration: result.duration_ms }, 'Bulk-create-markets complete');

  return c.json(result);
});

// ── Market deletion helpers & endpoints ──

async function deleteMarketCascade(marketId: string): Promise<{ id: string; question: string }> {
  const results = await db.select({ id: markets.id, question: markets.question }).from(markets).where(eq(markets.id, marketId));
  if (results.length === 0) throw new Error('Market not found');
  const market = results[0];

  await db.delete(opinions).where(eq(opinions.market_id, marketId));
  await db.delete(pointTransactions).where(eq(pointTransactions.market_id, marketId));
  await db.delete(marketAttachments).where(eq(marketAttachments.market_id, marketId));
  await db.delete(synthesisDeliverables).where(eq(synthesisDeliverables.market_id, marketId));
  await db.delete(markets).where(eq(markets.id, marketId));

  return market;
}

// DELETE /admin/api/markets/:id - permanently delete a market and all related data
// Must be registered BEFORE /:id POST routes to avoid param capture
adminRoutes.delete('/markets/:id', async (c) => {
  const marketId = c.req.param('id');

  try {
    const deleted = await deleteMarketCascade(marketId);
    logger.info({ marketId, question: deleted.question }, 'Admin deleted market');
    return c.json({ deleted: deleted });
  } catch (e: any) {
    if (e.message === 'Market not found') return c.json({ error: 'Market not found' }, 404);
    throw e;
  }
});

// POST /admin/api/markets/cleanup - batch delete markets matching LIKE patterns
// Must be registered BEFORE /:id routes to avoid param capture
adminRoutes.post('/markets/cleanup', async (c) => {
  let body: { patterns?: string[]; dry_run?: boolean };
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }

  const { patterns, dry_run = true } = body;

  if (!patterns || !Array.isArray(patterns) || patterns.length === 0) {
    return c.json({ error: 'patterns must be a non-empty array of LIKE patterns (e.g. ["Profile test market%"])' }, 400);
  }
  if (patterns.length > 10) {
    return c.json({ error: 'patterns must have at most 10 items' }, 400);
  }

  // Build OR conditions for all patterns
  const conditions = patterns.map(p => like(markets.question, p));
  const matched = await db.select({
    id: markets.id,
    question: markets.question,
    status: markets.status,
    created_at: markets.created_at,
  }).from(markets).where(or(...conditions));

  if (dry_run) {
    return c.json({
      dry_run: true,
      matched_count: matched.length,
      markets: matched,
    });
  }

  // Delete each matched market
  const deleted: { id: string; question: string }[] = [];
  for (const m of matched) {
    await deleteMarketCascade(m.id);
    deleted.push({ id: m.id, question: m.question });
  }

  logger.info({ patterns, deleted_count: deleted.length }, 'Admin batch cleanup completed');

  return c.json({
    dry_run: false,
    deleted_count: deleted.length,
    deleted,
  });
});

// ── Agent deletion endpoints ──
// deleteAgentCascade lives in src/services/agent-deletion.ts (shared with self-serve flow)

// DELETE /admin/agents/:id - permanently delete an agent and all related data
// Must be registered BEFORE /:id POST/PATCH routes to avoid param capture
adminRoutes.delete('/agents/:id', async (c) => {
  const agentId = c.req.param('id');

  try {
    const deleted = await deleteAgentCascade(agentId);
    logger.info({ agentId, handle: deleted.handle }, 'Admin deleted agent');
    return c.json({ deleted });
  } catch (e: any) {
    if (e.message === 'Agent not found') return c.json({ error: 'Agent not found' }, 404);
    throw e;
  }
});

// PATCH /admin/agents/:id/instructions - set custom instructions/objective for an agent
adminRoutes.patch('/agents/:id/instructions', async (c) => {
  const agentId = c.req.param('id');
  let body: { custom_instructions?: string; custom_objective?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }

  const { custom_instructions, custom_objective } = body;

  if (custom_instructions === undefined && custom_objective === undefined) {
    return c.json({ error: 'Provide at least one of: custom_instructions, custom_objective' }, 400);
  }
  if (custom_instructions !== undefined && custom_instructions !== null && (typeof custom_instructions !== 'string' || custom_instructions.length > 5000)) {
    return c.json({ error: 'custom_instructions must be a string of at most 5000 characters' }, 400);
  }
  if (custom_objective !== undefined && custom_objective !== null && (typeof custom_objective !== 'string' || custom_objective.length > 2000)) {
    return c.json({ error: 'custom_objective must be a string of at most 2000 characters' }, 400);
  }

  const agent = await db.select().from(agents).where(eq(agents.id, agentId));
  if (agent.length === 0) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const updates: Record<string, string | null> = {};
  if (custom_instructions !== undefined) updates.custom_instructions = custom_instructions;
  if (custom_objective !== undefined) updates.custom_objective = custom_objective;

  await db.update(agents)
    .set(updates)
    .where(eq(agents.id, agentId));

  return c.json({
    agent_id: agentId,
    handle: agent[0].handle,
    custom_instructions: custom_instructions !== undefined ? custom_instructions : agent[0].custom_instructions,
    custom_objective: custom_objective !== undefined ? custom_objective : agent[0].custom_objective,
  });
});

// POST /admin/agents/:id/grant-points - grant points to an agent
adminRoutes.post('/agents/:id/grant-points', async (c) => {
  const agentId = c.req.param('id');
  let body: { amount?: number };
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }
  const { amount } = body;

  if (typeof amount !== 'number' || !Number.isInteger(amount) || amount < 1) {
    return c.json({ error: 'amount must be a positive integer' }, 400);
  }
  if (amount > 10000) {
    return c.json({ error: 'amount must be at most 10000' }, 400);
  }

  const agent = await db.select().from(agents).where(eq(agents.id, agentId));
  if (agent.length === 0) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  const now = new Date().toISOString();

  await db.update(agents)
    .set({ points_balance: sql`${agents.points_balance} + ${amount}` })
    .where(eq(agents.id, agentId));

  await db.insert(pointTransactions).values({
    id: randomUUID(),
    agent_id: agentId,
    market_id: 'admin_grant',
    amount,
    type: 'system_funding',
    created_at: now,
  });

  const updated = await db.select({ points_balance: agents.points_balance })
    .from(agents)
    .where(eq(agents.id, agentId));

  return c.json({
    agent_id: agentId,
    amount_granted: amount,
    new_balance: updated[0]?.points_balance ?? 0,
    timestamp: now,
  });
});

// POST /admin/agents/:id/deactivate - soft-disable an agent
adminRoutes.post('/agents/:id/deactivate', async (c) => {
  const agentId = c.req.param('id');

  const agent = await db.select().from(agents).where(eq(agents.id, agentId));
  if (agent.length === 0) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  await db.update(agents)
    .set({ is_active: 0 })
    .where(eq(agents.id, agentId));

  return c.json({
    agent_id: agentId,
    handle: agent[0].handle,
    is_active: false,
    deactivated_at: new Date().toISOString(),
  });
});

// POST /admin/agents/:id/set-expiration - set an expiration time on an agent
adminRoutes.post('/agents/:id/set-expiration', async (c) => {
  const agentId = c.req.param('id');
  let body: { expires_at?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }
  const { expires_at } = body;

  if (!expires_at || isNaN(new Date(expires_at).getTime())) {
    return c.json({ error: 'expires_at must be a valid ISO datetime' }, 400);
  }

  const agent = await db.select().from(agents).where(eq(agents.id, agentId));
  if (agent.length === 0) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  await db.update(agents)
    .set({ expires_at: new Date(expires_at).toISOString() })
    .where(eq(agents.id, agentId));

  return c.json({
    agent_id: agentId,
    handle: agent[0].handle,
    expires_at: new Date(expires_at).toISOString(),
  });
});

// POST /admin/agents/:id/set-type - set agent_type (controls bulk-express eligibility:
// only non-'human' agents are eligible — see src/services/bulk-express.ts)
adminRoutes.post('/agents/:id/set-type', async (c) => {
  const agentId = c.req.param('id');
  let body: { agent_type?: string };
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }
  const { agent_type } = body;

  const VALID_TYPES = ['human', 'e2e', 'system'];
  if (!agent_type || !VALID_TYPES.includes(agent_type)) {
    return c.json({ error: `agent_type must be one of: ${VALID_TYPES.join(', ')}` }, 400);
  }

  const agent = await db.select().from(agents).where(eq(agents.id, agentId));
  if (agent.length === 0) {
    return c.json({ error: 'Agent not found' }, 404);
  }

  await db.update(agents)
    .set({ agent_type })
    .where(eq(agents.id, agentId));

  return c.json({
    agent_id: agentId,
    handle: agent[0].handle,
    agent_type,
  });
});

// GET /admin/agents - list agents with optional handle prefix filter
adminRoutes.get('/agents', async (c) => {
  const prefix = c.req.query('handle_prefix');
  const allAgents = await db.select({
    id: agents.id,
    handle: agents.handle,
    agent_type: agents.agent_type,
    points_balance: agents.points_balance,
    is_active: agents.is_active,
    created_at: agents.created_at,
    expires_at: agents.expires_at,
    custom_instructions: agents.custom_instructions,
    custom_objective: agents.custom_objective,
  }).from(agents);

  const filtered = prefix
    ? allAgents.filter(a => a.handle.startsWith(prefix))
    : allAgents;

  return c.json({ agents: filtered });
});

// POST /admin/api/agents/cleanup - remove expired and non-participating test agents
adminRoutes.post('/agents/cleanup', async (c) => {
  const body = await c.req.json().catch(() => ({}));
  const dryRun = body.dry_run !== false; // default to dry_run: true for safety

  const now = new Date().toISOString();

  // Find agents that are: expired, or e2e test agents, or deactivated
  // AND have zero opinions (not participating in any markets)
  const staleAgents = sqlite.prepare(`
    SELECT a.id, a.handle, a.is_active, a.expires_at, a.agent_type, a.created_at,
           COUNT(o.id) as opinion_count
    FROM agents a
    LEFT JOIN opinions o ON a.id = o.agent_id
    WHERE a.id != 'platform-treasury'
      AND (
        a.is_active = 0
        OR (a.expires_at IS NOT NULL AND a.expires_at < ?)
        OR a.handle LIKE 'e2e-%'
        OR a.agent_type = 'e2e'
      )
    GROUP BY a.id
    HAVING opinion_count = 0
    ORDER BY a.created_at ASC
  `).all(now) as any[];

  if (dryRun) {
    return c.json({
      dry_run: true,
      message: 'Set dry_run: false to actually delete these agents',
      stale_agents: staleAgents.length,
      agents: staleAgents.map(a => ({
        id: a.id,
        handle: a.handle,
        is_active: a.is_active,
        expires_at: a.expires_at,
        agent_type: a.agent_type,
        created_at: a.created_at,
      })),
    });
  }

  const deleted: { id: string; handle: string }[] = [];
  for (const agent of staleAgents) {
    try {
      await deleteAgentCascade(agent.id);
      deleted.push({ id: agent.id, handle: agent.handle });
    } catch (e: any) {
      logger.warn({ agentId: agent.id, error: e.message }, 'Failed to delete stale agent');
    }
  }

  logger.info({ count: deleted.length }, 'Stale agent cleanup completed');

  return c.json({
    dry_run: false,
    deleted_count: deleted.length,
    deleted,
  });
});

// POST /admin/api/markets/:id/approve - approve a pending_review market
adminRoutes.post('/markets/:id/approve', async (c) => {
  const marketId = c.req.param('id');

  const results = await db.select().from(markets).where(eq(markets.id, marketId));
  if (results.length === 0) {
    return c.json({ error: 'Market not found' }, 404);
  }

  const market = results[0];
  if (market.status !== 'pending_review') {
    return c.json({ error: 'Market is not pending review' }, 400);
  }

  // Extend deadline from now since the market was waiting for approval
  const originalDuration = new Date(market.deadline).getTime() - new Date(market.created_at).getTime();
  const newDeadline = new Date(Date.now() + originalDuration).toISOString();

  await db.update(markets)
    .set({ status: 'open', deadline: newDeadline })
    .where(eq(markets.id, marketId));

  logger.info({ marketId, question: market.question }, 'Admin approved agent market');

  return c.json({
    market_id: marketId,
    question: market.question,
    status: 'open',
    deadline: newDeadline,
    message: 'Market approved and now open for opinions',
  });
});

// POST /admin/api/markets/:id/reject - reject a pending_review market and refund the agent
adminRoutes.post('/markets/:id/reject', async (c) => {
  const marketId = c.req.param('id');
  let body: { reason?: string } = {};
  try { body = await c.req.json(); } catch { /* optional */ }

  const results = await db.select().from(markets).where(eq(markets.id, marketId));
  if (results.length === 0) {
    return c.json({ error: 'Market not found' }, 404);
  }

  const market = results[0];
  if (market.status !== 'pending_review') {
    return c.json({ error: 'Market is not pending review' }, 400);
  }

  const now = new Date().toISOString();

  // Update market status to rejected
  await db.update(markets)
    .set({ status: 'rejected' })
    .where(eq(markets.id, marketId));

  // Refund the agent's funding amount
  if (market.funded_amount && market.created_by) {
    await db.update(agents)
      .set({ points_balance: sql`${agents.points_balance} + ${market.funded_amount}` })
      .where(eq(agents.id, market.created_by));

    // Deduct platform fee from treasury (reverse the fee)
    if (market.platform_fee) {
      await db.update(agents)
        .set({ points_balance: sql`${agents.points_balance} - ${market.platform_fee}` })
        .where(eq(agents.id, PLATFORM_TREASURY_ID));
    }

    // Record refund transaction
    await db.insert(pointTransactions).values({
      id: randomUUID(),
      agent_id: market.created_by,
      market_id: marketId,
      amount: market.funded_amount,
      type: 'market_refund',
      created_at: now,
    });
  }

  logger.info({ marketId, question: market.question, reason: body.reason }, 'Admin rejected agent market');

  return c.json({
    market_id: marketId,
    question: market.question,
    status: 'rejected',
    reason: body.reason || null,
    refunded: market.funded_amount || 0,
  });
});

// POST /admin/api/markets/:id/close - close market and tally opinion distribution
adminRoutes.post('/markets/:id/close', async (c) => {
  const marketId = c.req.param('id');

  const results = await db.select().from(markets).where(eq(markets.id, marketId));
  if (results.length === 0) {
    return c.json({ error: 'Market not found' }, 404);
  }

  const market = results[0];
  if (market.status !== 'open') {
    return c.json({ error: 'Market is not open' }, 400);
  }

  // Tally opinion distribution
  const tally = await tallyMarket(marketId);

  // Update market status
  await db.update(markets)
    .set({
      status: 'resolved',
      majority_position: tally.majority_position,
    })
    .where(eq(markets.id, marketId));

  // Distribute participation rewards
  const rewardResult = await distributeRewards(marketId);

  return c.json({
    market_id: marketId,
    question: market.question,
    answer_type: market.answer_type,
    majority_position: tally.majority_position,
    vote_counts: tally.vote_counts,
    total_participants: tally.total,
    payouts: rewardResult.payouts,
    total_distributed: rewardResult.total_distributed,
  });
});
