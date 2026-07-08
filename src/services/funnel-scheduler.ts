/**
 * Funnel scheduler — auto-populates upcoming AM/PM session slots with funnel-themed
 * markets, gradually accumulating resolved markets until each funnel's target is hit.
 *
 * Runs from lifecycle.ts every ~60s. Idempotent — only fills under-allocated sessions
 * and never duplicates.
 *
 * Flow per active funnel:
 *   1. Deploy any admin-approved longform drafts into upcoming under-filled sessions.
 *   2. If committed markets+drafts still below target, generate more — sampling
 *      answer_type from the funnel's configured mix. Longform questions land in
 *      draft_questions for admin review; other types deploy straight to scheduled.
 */
import { randomUUID } from 'crypto';
import { sqlite } from '../db/index.js';
import { getActiveFunnels, type ResearchFunnel, type FunnelAnswerTypeMix } from './funnels.js';
import { ensureUpcomingSessions, nextSessionOrder, type SessionRecord } from './sessions.js';
import { generateMarketForFunnel, type FunnelAnswerType } from './market-generator.js';
import { normalizeContextForStorage } from './context.js';
import { getDefaultMarketFunding } from '../utils.js';
import logger from '../logger.js';

const UPCOMING_DAYS = 28;

interface UpcomingSession extends SessionRecord {
  current_funnel_count: number;
}

export async function populateUpcomingSessionsFromFunnels(now = new Date()): Promise<void> {
  ensureUpcomingSessions(UPCOMING_DAYS, now);
  const funnels = await getActiveFunnels();
  if (funnels.length === 0) return;

  for (const funnel of funnels) {
    try {
      await processFunnel(funnel, now);
    } catch (err) {
      logger.error({ err, funnelId: funnel.id }, 'Funnel scheduler: failed to process funnel');
    }
  }
}

async function processFunnel(funnel: ResearchFunnel, now: Date): Promise<void> {
  const upcoming = listUpcomingSessions(funnel.id, now);

  // Step 1: deploy approved longform drafts into upcoming session slots.
  const deployed = deployApprovedDrafts(funnel, upcoming);
  if (deployed > 0) {
    logger.info({ funnelId: funnel.id, deployed }, 'Funnel scheduler: deployed approved drafts');
  }

  // Step 2: if still under target, generate new questions.
  const counts = countFunnelCommitment(funnel.id);
  const committed = counts.resolved + counts.open + counts.scheduled + counts.pending_drafts;
  const remaining = funnel.target_resolved - committed;
  if (remaining <= 0) {
    logger.debug({ funnelId: funnel.id, committed, target: funnel.target_resolved }, 'Funnel at or over target — no generation');
    return;
  }

  // Re-read upcoming sessions to reflect any drafts we just deployed.
  const sessionsForGeneration = listUpcomingSessions(funnel.id, now);
  let placed = 0;
  for (const session of sessionsForGeneration) {
    if (placed >= remaining) break;
    const slotsHere = funnel.markets_per_session - session.current_funnel_count;
    if (slotsHere <= 0) continue;

    const limit = Math.min(slotsHere, remaining - placed);
    for (let i = 0; i < limit; i++) {
      const answerType = sampleAnswerType(funnel.mix);
      const template = await generateMarketForFunnel(funnel.id, answerType);
      if (!template) {
        logger.warn({ funnelId: funnel.id, answerType }, 'Funnel scheduler: generation returned null');
        continue;
      }
      if (answerType === 'longform') {
        insertFunnelDraft(funnel.id, template);
      } else {
        insertScheduledMarket(funnel.id, session, template);
        session.current_funnel_count++;
      }
      placed++;
    }
  }

  if (placed > 0) {
    logger.info({ funnelId: funnel.id, placed, remaining }, 'Funnel scheduler: placed new questions');
  }
}

function listUpcomingSessions(funnelId: string, now: Date): UpcomingSession[] {
  const rows = sqlite.prepare(`
    SELECT
      s.id, s.slot_label, s.scheduled_start_utc, s.deadline_utc, s.status,
      (SELECT COUNT(*) FROM markets m WHERE m.session_id = s.id AND m.research_theme = ?) AS current_funnel_count
    FROM sessions s
    WHERE s.status = 'scheduled' AND s.scheduled_start_utc > ?
    ORDER BY s.scheduled_start_utc ASC
  `).all(funnelId, now.toISOString()) as Array<UpcomingSession & { current_funnel_count: number | bigint }>;

  return rows.map(r => ({ ...r, current_funnel_count: Number(r.current_funnel_count) }));
}

interface CommitmentCounts {
  resolved: number;
  open: number;
  scheduled: number;
  pending_drafts: number;
}

function countFunnelCommitment(funnelId: string): CommitmentCounts {
  const marketCounts = sqlite.prepare(`
    SELECT status, COUNT(*) AS n FROM markets
    WHERE research_theme = ? AND status IN ('resolved', 'open', 'scheduled')
    GROUP BY status
  `).all(funnelId) as Array<{ status: string; n: number }>;

  const result: CommitmentCounts = { resolved: 0, open: 0, scheduled: 0, pending_drafts: 0 };
  for (const row of marketCounts) {
    if (row.status === 'resolved') result.resolved = row.n;
    else if (row.status === 'open') result.open = row.n;
    else if (row.status === 'scheduled') result.scheduled = row.n;
  }

  const draftRow = sqlite.prepare(`
    SELECT COUNT(*) AS n FROM draft_questions WHERE funnel_id = ? AND status IN ('draft', 'approved')
  `).get(funnelId) as { n: number };
  result.pending_drafts = draftRow.n;

  return result;
}

interface ApprovedDraftRow {
  id: string;
  question: string;
  description: string;
  category: string;
  answer_type: string;
  answer_options: string | null;
  response_constraints: string | null;
  context_json: string;
}

function deployApprovedDrafts(funnel: ResearchFunnel, upcoming: UpcomingSession[]): number {
  const drafts = sqlite.prepare(`
    SELECT id, question, description, category, answer_type, answer_options, response_constraints, context_json
    FROM draft_questions
    WHERE funnel_id = ? AND status = 'approved'
    ORDER BY created_at ASC
  `).all(funnel.id) as ApprovedDraftRow[];

  if (drafts.length === 0) return 0;

  const markDeployed = sqlite.prepare(`UPDATE draft_questions SET status = 'deployed', updated_at = ? WHERE id = ?`);
  let deployed = 0;

  for (const draft of drafts) {
    const session = upcoming.find(s => s.current_funnel_count < funnel.markets_per_session);
    if (!session) {
      logger.debug({ funnelId: funnel.id, draftId: draft.id }, 'No under-filled session for approved draft — waiting');
      break;
    }
    insertDeployedMarketFromDraft(funnel.id, session, draft);
    session.current_funnel_count++;
    markDeployed.run(new Date().toISOString(), draft.id);
    deployed++;
  }

  return deployed;
}

function insertDeployedMarketFromDraft(funnelId: string, session: UpcomingSession, draft: ApprovedDraftRow): void {
  const id = randomUUID();
  const now = new Date().toISOString();
  const rewardPool = getDefaultMarketFunding();
  sqlite.prepare(`
    INSERT INTO markets (
      id, question, description, context_json, category, status, created_by, deadline, created_at,
      funded_amount, platform_fee, reward_pool, reward_distributed,
      answer_type, answer_options, response_constraints, knowledge_source, tags,
      scheduled_start, session_id, session_order, creator_type, research_theme
    ) VALUES (?, ?, ?, ?, ?, 'scheduled', 'funnel-scheduler', ?, ?, ?, 0, ?, 0, ?, ?, ?, 'local_only', ?, ?, ?, ?, 'system', ?)
  `).run(
    id,
    draft.question,
    draft.description,
    draft.context_json,
    draft.category,
    session.deadline_utc,
    now,
    rewardPool,
    rewardPool,
    draft.answer_type,
    draft.answer_options,
    draft.response_constraints,
    JSON.stringify([funnelId]),
    session.scheduled_start_utc,
    session.id,
    nextSessionOrder(session.id),
    funnelId
  );
}

function insertScheduledMarket(funnelId: string, session: UpcomingSession, template: Awaited<ReturnType<typeof generateMarketForFunnel>>): void {
  if (!template) return;
  const id = randomUUID();
  const now = new Date().toISOString();
  const rewardPool = getDefaultMarketFunding();
  const normalizedContext = normalizeContextForStorage(template.context);
  sqlite.prepare(`
    INSERT INTO markets (
      id, question, description, context_json, category, status, created_by, deadline, created_at,
      funded_amount, platform_fee, reward_pool, reward_distributed,
      answer_type, answer_options, response_constraints, knowledge_source, tags,
      scheduled_start, session_id, session_order, creator_type, research_theme
    ) VALUES (?, ?, ?, ?, ?, 'scheduled', 'funnel-scheduler', ?, ?, ?, 0, ?, 0, ?, ?, ?, 'local_only', ?, ?, ?, ?, 'system', ?)
  `).run(
    id,
    template.question,
    template.description,
    JSON.stringify(normalizedContext),
    template.category,
    session.deadline_utc,
    now,
    rewardPool,
    rewardPool,
    template.answer_type || 'binary',
    template.answer_options ? JSON.stringify(template.answer_options) : null,
    template.response_constraints ? JSON.stringify(template.response_constraints) : null,
    template.tags ? JSON.stringify(template.tags) : JSON.stringify([funnelId]),
    session.scheduled_start_utc,
    session.id,
    nextSessionOrder(session.id),
    funnelId
  );
}

function insertFunnelDraft(funnelId: string, template: NonNullable<Awaited<ReturnType<typeof generateMarketForFunnel>>>): void {
  const id = randomUUID();
  const now = new Date().toISOString();
  const normalizedContext = normalizeContextForStorage(template.context);
  sqlite.prepare(`
    INSERT INTO draft_questions (
      id, surface_topic_id, funnel_id, question, description, category,
      answer_type, answer_options, response_constraints, context_json,
      status, generation_round, created_at, updated_at
    ) VALUES (?, NULL, ?, ?, ?, ?, ?, ?, ?, ?, 'draft', 1, ?, ?)
  `).run(
    id,
    funnelId,
    template.question,
    template.description,
    template.category,
    template.answer_type || 'longform',
    template.answer_options ? JSON.stringify(template.answer_options) : null,
    template.response_constraints ? JSON.stringify(template.response_constraints) : null,
    JSON.stringify(normalizedContext),
    now,
    now
  );
}

function sampleAnswerType(mix: FunnelAnswerTypeMix): FunnelAnswerType {
  const r = Math.random();
  const cumulative: Array<[FunnelAnswerType, number]> = [
    ['binary', mix.binary],
    ['single_choice', mix.binary + mix.single_choice],
    ['multi_choice', mix.binary + mix.single_choice + mix.multi_choice],
    ['longform', 1],
  ];
  for (const [type, threshold] of cumulative) {
    if (r < threshold) return type;
  }
  return 'longform';
}
