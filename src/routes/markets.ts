import { Hono } from 'hono';
import { randomUUID } from 'crypto';
import { mkdirSync, writeFileSync, readFileSync, existsSync } from 'node:fs';
import { join, extname } from 'node:path';
import { eq, and, desc, asc, ne, sql } from 'drizzle-orm';
import { db, sqlite } from '../db/index.js';
import { markets, opinions, pointTransactions, agents, marketAttachments } from '../db/schema.js';
import { authMiddleware } from '../middleware/auth.js';
import { opinionRateLimit, makerRateLimit } from '../middleware/rateLimit.js';
import { profileGateMiddleware } from '../middleware/profileGate.js';
import { consentGateMiddleware } from '../middleware/consentGate.js';
import { validateAnswerOptions, validateResponseConstraints, validateLongformAnswer, validateKnowledgeSource, validateMarketQuestion, validateMarketDescription, validateMarketContext, validateBasis, validateMultiChoiceAnswer, validateRankingAnswer, validateScaleAnswer, validateScaleConfig, validateProvenance } from '../services/validation.js';
import { PLATFORM_TREASURY_ID, VALID_CATEGORIES } from '../types.js';
import type { CreateMakerMarketBody, ResponseConstraints } from '../types.js';
import { safeJsonParse } from '../utils.js';
import { computeClassification } from '../services/classification.js';
import { getNextSession, type SessionRecord } from '../services/sessions.js';
import { EMPTY_MARKET_CONTEXT, normalizeContextForResponse, normalizeContextForStorage, collectContextIds } from '../services/context.js';
import { computeProvenanceScore } from '../services/provenance.js';
import { buildAggregateResults, resolveCohortParam } from '../services/results.js';
import { redactPII, redactFreeTextFields } from '../services/pii.js';
import { isAdminApiKey } from '../config/admin-auth.js';
import logger from '../logger.js';

export const marketRoutes = new Hono();

function getSessionInfo(sessionId: string | null) {
  if (!sessionId) return null;
  const session = sqlite.prepare('SELECT * FROM sessions WHERE id = ?').get(sessionId) as SessionRecord | undefined;
  if (!session) return null;
  return {
    id: session.id,
    slot_label: session.slot_label,
    scheduled_start_utc: session.scheduled_start_utc,
    deadline_utc: session.deadline_utc,
    status: session.status,
  };
}

function serializeMarket(m: typeof markets.$inferSelect) {
  const { context_json, answer_options, response_constraints, research_theme: _rt, ...rest } = m;
  const normalizedContext = normalizeContextForResponse(safeJsonParse(context_json, EMPTY_MARKET_CONTEXT));
  return {
    ...rest,
    session: getSessionInfo(m.session_id),
    context: normalizedContext,
    answer_options: answer_options ? safeJsonParse<string[] | null>(answer_options, null) : null,
    response_constraints: response_constraints ? safeJsonParse(response_constraints, null) : null,
  };
}

// GET /markets/upcoming - market activity hints (public, no auth)
marketRoutes.get('/upcoming', async (c) => {
  const openMarkets = await db.select().from(markets).where(eq(markets.status, 'open'));
  const scheduledMarkets = await db.select().from(markets).where(eq(markets.status, 'scheduled'));

  const nextDeadline = openMarkets.length > 0
    ? openMarkets.reduce((earliest, m) => m.deadline < earliest ? m.deadline : earliest, openMarkets[0].deadline)
    : null;

  const hint = openMarkets.length < 3
    ? 'New markets expected within the next few hours'
    : 'Current markets are active — check back after some resolve';

  const categoriesActive = [...new Set(openMarkets.map(m => m.category))];
  const totalRewardAvailable = openMarkets.reduce((sum, m) => sum + (m.reward_pool || 0), 0);

  return c.json({
    open_count: openMarkets.length,
    scheduled_count: scheduledMarkets.length,
    next_deadline: nextDeadline,
    next_session: getNextSession(),
    hint,
    categories_active: categoriesActive,
    total_reward_available: totalRewardAvailable,
  });
});

// GET /markets - list markets (public, no auth)
marketRoutes.get('/', async (c) => {
  const status = c.req.query('status');
  const category = c.req.query('category');
  const sort = c.req.query('sort');
  const createdBy = c.req.query('created_by');
  const creatorType = c.req.query('creator_type');

  const conditions = [];

  if (status) {
    conditions.push(eq(markets.status, status));
  } else {
    conditions.push(eq(markets.status, 'open'));
  }

  if (category) {
    conditions.push(eq(markets.category, category));
  }

  // Filter by creator_type (preferred) or created_by (legacy)
  if (creatorType) {
    conditions.push(eq(markets.creator_type, creatorType));
  } else if (createdBy === 'agent') {
    conditions.push(ne(markets.created_by, 'lifecycle'));
    conditions.push(ne(markets.created_by, 'admin'));
  } else if (createdBy) {
    conditions.push(eq(markets.created_by, createdBy));
  }

  const orderBy = sort === 'deadline'
    ? asc(markets.deadline)
    : desc(markets.created_at);

  const whereClause = conditions.length > 1
    ? and(...conditions)
    : conditions[0];

  const results = await db
    .select()
    .from(markets)
    .where(whereClause)
    .orderBy(orderBy);

  const parsed = results.map(serializeMarket);

  return c.json({ markets: parsed, next_session: getNextSession() });
});

// GET /markets/:id - full market detail (public)
marketRoutes.get('/:id', async (c) => {
  const id = c.req.param('id');

  const results = await db.select().from(markets).where(eq(markets.id, id));
  if (results.length === 0) {
    return c.json({ error: 'Market not found' }, 404);
  }

  const market = results[0];

  const attachments = await db.select({
    id: marketAttachments.id,
    filename: marketAttachments.filename,
    original_name: marketAttachments.original_name,
    content_type: marketAttachments.content_type,
    size_bytes: marketAttachments.size_bytes,
    created_at: marketAttachments.created_at,
  }).from(marketAttachments).where(eq(marketAttachments.market_id, id));

  return c.json({
    ...serializeMarket(market),
    attachments: attachments.map(a => ({
      ...a,
      url: `/markets/${id}/attachments/${a.filename}`,
    })),
  });
});

// GET /markets/:id/results — public, anonymized, cohort-filtered, K-anon-gated.
// See src/services/results.ts for the cohort + K-anonymity logic.
marketRoutes.get('/:id/results', async (c) => {
  const marketId = c.req.param('id')!;
  const cohort = resolveCohortParam(c.req.query('cohort'));

  const results = await db.select().from(markets).where(eq(markets.id, marketId));
  if (results.length === 0) {
    return c.json({ error: 'Market not found' }, 404);
  }
  const market = results[0];
  if (market.status !== 'resolved') {
    return c.json({ error: 'Market is not resolved yet' }, 400);
  }

  const aggregate = await buildAggregateResults(market, { cohort });
  return c.json(aggregate);
});

// POST /markets/:id/express - express opinion on a market (authed)
marketRoutes.post('/:id/express', authMiddleware, consentGateMiddleware, profileGateMiddleware, opinionRateLimit, async (c) => {
  const marketId = c.req.param('id')!;
  const agent = (c as any).get('agent') as { id: string };
  let body: any;
  try { body = await c.req.json(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }
  const { answer, basis, confidence, provenance } = body;

  const marketResults = await db.select().from(markets).where(eq(markets.id, marketId));
  if (marketResults.length === 0) {
    return c.json({ error: 'Market not found' }, 404);
  }

  const market = marketResults[0];

  if (market.status !== 'open') {
    return c.json({ error: 'Market is not open for opinions' }, 400);
  }

  // Block maker self-participation
  if (market.created_by === agent.id) {
    return c.json({ error: 'Makers cannot express opinions on their own markets' }, 403);
  }

  // Enforce max participants
  if (market.max_participants) {
    const participantCount = await db.select({ count: sql<number>`count(*)` })
      .from(opinions)
      .where(eq(opinions.market_id, marketId));
    if (participantCount[0].count >= market.max_participants) {
      return c.json({ error: 'Market has reached its maximum number of participants' }, 400);
    }
  }

  // Validate answer based on market's answer type
  const answerType = market.answer_type || 'binary';

  if (answerType === 'longform') {
    const constraints = market.response_constraints ? safeJsonParse<ResponseConstraints | null>(market.response_constraints, null) : null;
    if (!constraints) {
      return c.json({ error: 'Longform market is missing response constraints' }, 500);
    }
    const validation = validateLongformAnswer(answer, constraints);
    if (!validation.valid) {
      return c.json({ error: validation.error }, 400);
    }
  } else if (answerType === 'single_choice') {
    const answerOptions = market.answer_options ? safeJsonParse<string[] | null>(market.answer_options, null) : null;
    if (!answerOptions) {
      return c.json({ error: 'Single-choice market is missing answer options' }, 500);
    }
    if (answer !== 'abstain' && !answerOptions.includes(answer)) {
      return c.json({ error: `Answer must be one of: ${answerOptions.join(', ')}, abstain` }, 400);
    }
  } else if (answerType === 'multi_choice') {
    const answerOptions = market.answer_options ? safeJsonParse<string[] | null>(market.answer_options, null) : null;
    if (!answerOptions) {
      return c.json({ error: 'Multi-choice market is missing answer options' }, 500);
    }
    if (answer === 'abstain') {
      // abstain is fine as a plain string
    } else {
      const validation = validateMultiChoiceAnswer(answer, answerOptions);
      if (!validation.valid) {
        return c.json({ error: validation.error }, 400);
      }
    }
  } else if (answerType === 'ranking') {
    const answerOptions = market.answer_options ? safeJsonParse<string[] | null>(market.answer_options, null) : null;
    if (!answerOptions) {
      return c.json({ error: 'Ranking market is missing answer options' }, 500);
    }
    if (answer === 'abstain') {
      // abstain is fine as a plain string
    } else {
      const validation = validateRankingAnswer(answer, answerOptions);
      if (!validation.valid) {
        return c.json({ error: validation.error }, 400);
      }
    }
  } else if (answerType === 'scale') {
    const scaleConfig = market.answer_options ? safeJsonParse<{ min: number; max: number } | null>(market.answer_options, null) : null;
    if (!scaleConfig) {
      return c.json({ error: 'Scale market is missing scale configuration' }, 500);
    }
    if (answer !== 'abstain') {
      const validation = validateScaleAnswer(answer, scaleConfig);
      if (!validation.valid) {
        return c.json({ error: validation.error }, 400);
      }
    }
  } else {
    if (answer !== 'yes' && answer !== 'no' && answer !== 'abstain') {
      return c.json({ error: 'Answer must be "yes", "no", or "abstain"' }, 400);
    }
  }

  // Validate optional basis field (length + injection detection)
  const basisValidation = validateBasis(basis);
  if (!basisValidation.valid) {
    return c.json({ error: basisValidation.error }, 400);
  }

  // Validate required provenance payload
  const normalizedContext = normalizeContextForResponse(safeJsonParse(market.context_json, EMPTY_MARKET_CONTEXT));
  const attachmentRows = await db.select({ id: marketAttachments.id }).from(marketAttachments).where(eq(marketAttachments.market_id, marketId));
  const provenanceValidation = validateProvenance(provenance, {
    ...collectContextIds(normalizedContext),
    attachmentIds: new Set(attachmentRows.map(a => a.id)),
  });
  if (!provenanceValidation.valid) {
    return c.json({ error: provenanceValidation.error }, 400);
  }

  // Validate optional confidence field (0-100)
  if (confidence !== undefined && confidence !== null) {
    if (typeof confidence !== 'number' || !Number.isInteger(confidence) || confidence < 0 || confidence > 100) {
      return c.json({ error: 'confidence must be an integer between 0 and 100' }, 400);
    }
  }

  const existing = await db.select().from(opinions).where(
    and(eq(opinions.market_id, marketId), eq(opinions.agent_id, agent.id))
  );
  if (existing.length > 0) {
    return c.json({ error: 'You have already expressed your opinion on this market' }, 409);
  }

  const opinionId = randomUUID();
  const now = new Date().toISOString();
  const provenancePayload = provenanceValidation.sanitized!;
  const knowledgeSource = validateKnowledgeSource(market.knowledge_source).sanitized ?? 'any';
  const provenanceScore = computeProvenanceScore(provenancePayload, knowledgeSource);

  // Step 1: longform answers go through the answer-level PII pipeline. Hard-PII
  // (EMAIL/PHONE/SSN/CC/PERSON) is rejected; softer findings queue for admin review.
  // Typed answers (binary, choice, scale, ranking) skip this — they cannot leak
  // free-text PII through `answer` by construction.
  let reviewState: 'pending' | 'approved' | null = null;
  let redactedAnswer: string | null = null;
  let piiFindingsJson: string | null = null;
  if (answerType === 'longform') {
    const piiResult = await redactPII(answer as string);
    if (piiResult.severity === 'reject') {
      return c.json({
        error: 'Answer contains personally identifiable information and was not stored',
        pii_categories: piiResult.findings.map(f => f.category),
        guidance: 'Rewrite your answer without specific names, contact details, or identifying personal data.',
      }, 400);
    }
    reviewState = piiResult.severity === 'review' ? 'pending' : 'approved';
    redactedAnswer = piiResult.redacted;
    piiFindingsJson = JSON.stringify({
      provider: piiResult.provider,
      severity: piiResult.severity,
      findings: piiResult.findings,
    });
  }

  // Step 2: every opinion (typed AND longform) has free-text basis + provenance
  // fields filtered for PII. Per CEO plan D5: basis/provenance PII never
  // produces a 400 — we redact in-place and store the redacted text. We
  // intentionally do NOT persist findings-with-spans for basis/provenance —
  // storing those spans would be a fresh privacy violation. Category counts
  // for these findings are summarized on the response only.
  const freeTextResult = await redactFreeTextFields({
    basis: basis ?? null,
    provenance: provenancePayload,
  });
  const storedBasis = freeTextResult.basis_redacted;
  const storedProvenance = freeTextResult.provenance_redacted;

  await db.insert(opinions).values({
    id: opinionId,
    market_id: marketId,
    agent_id: agent.id,
    answer,
    basis: storedBasis,
    provenance_json: JSON.stringify(storedProvenance),
    provenance_score: provenanceScore.score,
    confidence: confidence ?? null,
    created_at: now,
    review_state: reviewState,
    redacted_answer: redactedAnswer,
    pii_findings_json: piiFindingsJson,
  });

  // Recompute classification for this agent (non-blocking)
  computeClassification(agent.id).catch(err =>
    logger.error({ err, agentId: agent.id }, 'Failed to recompute classification')
  );

  return c.json({
    id: opinionId,
    market_id: marketId,
    agent_id: agent.id,
    answer: answerType === 'longform' && reviewState === 'pending' ? null : answer,
    basis: storedBasis,
    provenance: storedProvenance,
    provenance_score: provenanceScore.score,
    confidence: confidence ?? null,
    created_at: now,
    review_state: reviewState,
  }, 201);
});

// POST /markets - create a funded market (maker API, authed)
marketRoutes.post('/', authMiddleware, consentGateMiddleware, profileGateMiddleware, makerRateLimit, async (c) => {
  const agent = (c as any).get('agent') as { id: string; points_balance: number };
  let body: CreateMakerMarketBody;
  try { body = await c.req.json<CreateMakerMarketBody>(); } catch { return c.json({ error: 'Invalid JSON body' }, 400); }
  const { question, description, context, category, deadline, funding_amount, answer_options, answer_type, response_constraints, knowledge_source } = body;

  // Validate required fields
  if (!question || !description || !category || !deadline) {
    return c.json({ error: 'Missing required fields: question, description, category, deadline' }, 400);
  }

  // Validate question and description for length + injection patterns
  const questionValidation = validateMarketQuestion(question);
  if (!questionValidation.valid) {
    return c.json({ error: questionValidation.error }, 400);
  }

  const descriptionValidation = validateMarketDescription(description);
  if (!descriptionValidation.valid) {
    return c.json({ error: descriptionValidation.error }, 400);
  }

  // Validate context JSON fields
  const contextValidation = validateMarketContext(context);
  if (!contextValidation.valid) {
    return c.json({ error: contextValidation.error }, 400);
  }

  if (typeof funding_amount !== 'number' || !Number.isInteger(funding_amount)) {
    return c.json({ error: 'funding_amount must be an integer' }, 400);
  }

  const minFunding = parseInt(process.env.MIN_MARKET_FUNDING || '50');
  if (funding_amount < minFunding) {
    return c.json({ error: `funding_amount must be at least ${minFunding}` }, 400);
  }

  if (!(VALID_CATEGORIES as readonly string[]).includes(category)) {
    return c.json({ error: `Category must be one of: ${VALID_CATEGORIES.join(', ')}` }, 400);
  }

  // Validate deadline
  const deadlineDate = new Date(deadline);
  if (isNaN(deadlineDate.getTime())) {
    return c.json({ error: 'Invalid deadline format' }, 400);
  }
  const now = new Date();
  const minMinutes = parseInt(process.env.MIN_MARKET_DURATION_MINUTES || '1');
  const maxHours = parseInt(process.env.MAX_MARKET_DURATION_HOURS || '72');
  const minutesUntilDeadline = (deadlineDate.getTime() - now.getTime()) / 60000;
  if (minutesUntilDeadline < minMinutes) {
    return c.json({ error: `Deadline must be at least ${minMinutes} minute(s) from now` }, 400);
  }
  if (minutesUntilDeadline > maxHours * 60) {
    return c.json({ error: `Deadline must be at most ${maxHours} hours from now` }, 400);
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
    if (response_constraints) {
      return c.json({ error: `${marketAnswerType} markets cannot have response_constraints` }, 400);
    }
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
    if (response_constraints) {
      return c.json({ error: 'Scale markets cannot have response_constraints' }, 400);
    }
    if (!answer_options) {
      return c.json({ error: 'Scale markets require answer_options with { min, max } configuration' }, 400);
    }
    const scaleValidation = validateScaleConfig(answer_options);
    if (!scaleValidation.valid) {
      return c.json({ error: scaleValidation.error }, 400);
    }
    sanitizedScaleConfig = scaleValidation.sanitized!;
  } else {
    // binary
    if (answer_options) {
      return c.json({ error: 'Binary markets cannot have answer_options. Use answer_type "single_choice" instead.' }, 400);
    }
    if (response_constraints) {
      return c.json({ error: 'Binary markets cannot have response_constraints. Use answer_type "longform" instead.' }, 400);
    }
  }

  // Validate knowledge_source
  const ksValidation = validateKnowledgeSource(knowledge_source);
  if (!ksValidation.valid) {
    return c.json({ error: ksValidation.error }, 400);
  }

  // Check agent has sufficient balance
  const agentRecord = await db.select().from(agents).where(eq(agents.id, agent.id));
  if (agentRecord.length === 0) {
    return c.json({ error: 'Agent not found' }, 404);
  }
  if (agentRecord[0].points_balance < funding_amount) {
    return c.json({ error: `Insufficient balance. You have ${agentRecord[0].points_balance} points, need ${funding_amount}` }, 400);
  }

  // Calculate fees and pool
  const takeRate = parseFloat(process.env.TAKE_RATE || '0.6');
  const platformFee = Math.floor(funding_amount * takeRate);
  const rewardPool = funding_amount - platformFee;

  const marketId = randomUUID();
  const createdAt = now.toISOString();
  const defaultContext = { articles: [], data_points: [], links: [] };
  const normalizedContext = normalizeContextForStorage(context || defaultContext);

  // Deduct from maker
  await db.update(agents)
    .set({ points_balance: sql`${agents.points_balance} - ${funding_amount}` })
    .where(eq(agents.id, agent.id));

  // Credit treasury
  await db.update(agents)
    .set({ points_balance: sql`${agents.points_balance} + ${platformFee}` })
    .where(eq(agents.id, PLATFORM_TREASURY_ID));

  // Record transactions
  await db.insert(pointTransactions).values({
    id: randomUUID(),
    agent_id: agent.id,
    market_id: marketId,
    amount: -funding_amount,
    type: 'market_funding',
    created_at: createdAt,
  });

  await db.insert(pointTransactions).values({
    id: randomUUID(),
    agent_id: PLATFORM_TREASURY_ID,
    market_id: marketId,
    amount: platformFee,
    type: 'platform_fee',
    created_at: createdAt,
  });

  // Agent-created markets enter pending_review status for admin approval
  const marketStatus = 'pending_review';

  // Insert market
  await db.insert(markets).values({
    id: marketId,
    question,
    description,
    context_json: JSON.stringify(normalizedContext),
    category,
    status: marketStatus,
    created_by: agent.id,
    deadline,
    created_at: createdAt,
    funded_amount: funding_amount,
    platform_fee: platformFee,
    reward_pool: rewardPool,
    reward_distributed: 0,
    answer_options: sanitizedScaleConfig ? JSON.stringify(sanitizedScaleConfig) : sanitizedOptions ? JSON.stringify(sanitizedOptions) : null,
    answer_type: marketAnswerType,
    response_constraints: sanitizedConstraints ? JSON.stringify(sanitizedConstraints) : null,
    knowledge_source: ksValidation.sanitized!,
    creator_type: 'agent',
  });

  return c.json({
    id: marketId,
    question,
    description,
    context: normalizedContext,
    category,
    status: marketStatus,
    created_by: agent.id,
    deadline,
    created_at: createdAt,
    funded_amount: funding_amount,
    platform_fee: platformFee,
    reward_pool: rewardPool,
    answer_options: sanitizedOptions,
    answer_type: marketAnswerType,
    response_constraints: sanitizedConstraints,
    knowledge_source: ksValidation.sanitized,
    message: 'Market submitted for review. It will become active after admin approval.',
  }, 201);
});

// Attachment constants
const UPLOAD_DIR = process.env.UPLOAD_DIR || './uploads';
const MAX_FILE_SIZE = 5 * 1024 * 1024; // 5MB
const ALLOWED_TYPES: Record<string, string> = {
  'image/jpeg': '.jpg',
  'image/png': '.png',
  'image/webp': '.webp',
  'application/pdf': '.pdf',
};

// POST /markets/:id/attachments - upload attachment (authed, market owner or admin)
marketRoutes.post('/:id/attachments', authMiddleware, async (c) => {
  const marketId = c.req.param('id')!;
  const agent = (c as any).get('agent') as { id: string };

  const marketResults = await db.select().from(markets).where(eq(markets.id, marketId));
  if (marketResults.length === 0) {
    return c.json({ error: 'Market not found' }, 404);
  }

  const market = marketResults[0];
  const isAdmin = agent.id === '__admin__' || isAdminApiKey(c.req.header('X-Admin-Key'));
  if (market.created_by !== agent.id && !isAdmin) {
    return c.json({ error: 'Only the market creator or admin can upload attachments' }, 403);
  }

  const body = await c.req.parseBody();
  const file = body['file'];
  if (!file || typeof file === 'string') {
    return c.json({ error: 'No file uploaded. Send as multipart/form-data with field name "file"' }, 400);
  }

  const contentType = file.type;
  if (!ALLOWED_TYPES[contentType]) {
    return c.json({ error: `Unsupported file type: ${contentType}. Allowed: ${Object.keys(ALLOWED_TYPES).join(', ')}` }, 400);
  }

  const buffer = Buffer.from(await file.arrayBuffer());
  if (buffer.length > MAX_FILE_SIZE) {
    return c.json({ error: `File too large (${(buffer.length / 1024 / 1024).toFixed(1)}MB). Max: 5MB` }, 400);
  }

  const ext = ALLOWED_TYPES[contentType] || extname(file.name || '');
  const storedFilename = `${randomUUID()}${ext}`;
  const marketDir = join(UPLOAD_DIR, marketId);
  mkdirSync(marketDir, { recursive: true });
  writeFileSync(join(marketDir, storedFilename), buffer);

  const attachmentId = randomUUID();
  const now = new Date().toISOString();
  await db.insert(marketAttachments).values({
    id: attachmentId,
    market_id: marketId,
    filename: storedFilename,
    original_name: file.name || 'unnamed',
    content_type: contentType,
    size_bytes: buffer.length,
    created_at: now,
  });

  return c.json({
    id: attachmentId,
    market_id: marketId,
    filename: storedFilename,
    original_name: file.name || 'unnamed',
    content_type: contentType,
    size_bytes: buffer.length,
    url: `/markets/${marketId}/attachments/${storedFilename}`,
    created_at: now,
  }, 201);
});

// GET /markets/:id/attachments/:filename - serve attachment (public)
marketRoutes.get('/:id/attachments/:filename', async (c) => {
  const marketId = c.req.param('id')!;
  const filename = c.req.param('filename')!;

  // Prevent directory traversal
  if (filename.includes('..') || filename.includes('/') || filename.includes('\\')) {
    return c.json({ error: 'Invalid filename' }, 400);
  }

  const filePath = join(UPLOAD_DIR, marketId, filename);
  if (!existsSync(filePath)) {
    return c.json({ error: 'Attachment not found' }, 404);
  }

  const record = await db.select().from(marketAttachments).where(
    and(eq(marketAttachments.market_id, marketId), eq(marketAttachments.filename, filename))
  );
  const contentType = record[0]?.content_type || 'application/octet-stream';

  const data = readFileSync(filePath);
  c.header('Content-Type', contentType);
  c.header('Cache-Control', 'public, max-age=86400');
  return c.body(data);
});
