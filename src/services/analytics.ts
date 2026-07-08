import { sqlite } from '../db/index.js';
import { safeJsonParse } from '../utils.js';
import { EMPTY_MARKET_CONTEXT, normalizeContextForResponse } from './context.js';
import { computeProvenanceScore } from './provenance.js';
import { getAllFunnels, getFunnelById, type ResearchFunnel } from './funnels.js';
import { getClassifiedAgents, type ClassifiedAgentFilters } from './classification.js';
import type { ProvenancePayload, ProvenanceSourceType } from '../types.js';

// Ensure funnel_confirmations table exists (lightweight KV for admin confirmations)
sqlite.exec(`CREATE TABLE IF NOT EXISTS funnel_confirmations (
  funnel_id TEXT PRIMARY KEY,
  confirmed_at TEXT NOT NULL
)`);

const PROVENANCE_SOURCE_TYPES = new Set<ProvenanceSourceType>([
  'article',
  'data_point',
  'link',
  'attachment',
  'agent_kb',
  'local',
  'training',
]);

function normalizeProvenance(rawJson: string | null | undefined): { payload: ProvenancePayload | null; sources: ProvenancePayload['sources'] } {
  if (!rawJson || typeof rawJson !== 'string') {
    return { payload: null, sources: [] };
  }

  const parsed = safeJsonParse<any>(rawJson, null);
  if (!parsed || typeof parsed !== 'object' || Array.isArray(parsed)) {
    return { payload: null, sources: [] };
  }

  const rawSources = Array.isArray(parsed.sources) ? parsed.sources : [];
  const sources: ProvenancePayload['sources'] = [];

  for (const source of rawSources) {
    if (typeof source === 'string') {
      if (PROVENANCE_SOURCE_TYPES.has(source as ProvenanceSourceType)) {
        sources.push({ type: source as ProvenanceSourceType });
      }
      continue;
    }
    if (!source || typeof source !== 'object' || Array.isArray(source)) continue;
    const type = (source as any).type;
    if (typeof type !== 'string' || !PROVENANCE_SOURCE_TYPES.has(type as ProvenanceSourceType)) continue;
    const entry: ProvenancePayload['sources'][number] = { type: type as ProvenanceSourceType };
    if (typeof (source as any).id === 'string' && (source as any).id.trim().length > 0) entry.id = (source as any).id;
    if (typeof (source as any).note === 'string' && (source as any).note.trim().length > 0) entry.note = (source as any).note;
    sources.push(entry);
  }

  const localSummary = typeof (parsed as any).local_summary === 'string' ? (parsed as any).local_summary : undefined;
  if (sources.length === 0 && !localSummary) {
    return { payload: null, sources: [] };
  }

  const payload: ProvenancePayload = { sources };
  if (localSummary) payload.local_summary = localSummary;
  return { payload, sources };
}

export function getOverview() {
  const totalAgents = (sqlite.prepare('SELECT COUNT(*) as count FROM agents WHERE is_active = 1').get() as any).count;

  const marketRows = sqlite.prepare('SELECT status, COUNT(*) as count FROM markets GROUP BY status').all() as any[];
  const marketsByStatus: Record<string, number> = { open: 0, closed: 0, resolved: 0 };
  let totalMarkets = 0;
  for (const row of marketRows) {
    marketsByStatus[row.status] = row.count;
    totalMarkets += row.count;
  }

  const totalOpinions = (sqlite.prepare('SELECT COUNT(*) as count FROM opinions').get() as any).count;

  const totalPoints = (sqlite.prepare('SELECT COALESCE(SUM(amount), 0) as total FROM point_transactions').get() as any).total;

  return {
    total_agents: totalAgents,
    total_markets: { ...marketsByStatus, total: totalMarkets },
    total_opinions: totalOpinions,
    total_points_distributed: totalPoints,
  };
}

export function getAgentAnalytics(sort: string = 'points', limit: number = 1000) {
  const leaderboardQuery = sqlite.prepare(`
    SELECT
      a.id as agent_id, a.handle, a.points_balance, a.created_at, a.agent_type,
      COUNT(p.id) as total_opinions,
      MAX(p.created_at) as last_opinion_at,
      COUNT(DISTINCT CASE WHEN m.status = 'resolved' THEN p.market_id END) as resolved_markets
    FROM agents a
    LEFT JOIN opinions p ON a.id = p.agent_id
    LEFT JOIN markets m ON p.market_id = m.id
    GROUP BY a.id
  `);

  const rows = leaderboardQuery.all() as any[];

  const leaderboard = rows.map((r) => ({
    agent_id: r.agent_id,
    handle: r.handle,
    points_balance: r.points_balance,
    total_opinions: r.total_opinions,
    resolved_markets: r.resolved_markets,
    last_opinion_at: r.last_opinion_at,
    agent_type: r.agent_type || null,
  }));

  const sortKey = sort === 'opinions' ? 'total_opinions' : 'points_balance';
  leaderboard.sort((a: any, b: any) => b[sortKey] - a[sortKey]);
  const limited = leaderboard.slice(0, limit);

  const inactiveCount = rows.filter((r) => r.total_opinions === 0).length;

  const recentActivity = sqlite.prepare(`
    SELECT
      COUNT(CASE WHEN created_at >= datetime('now', '-1 day') THEN 1 END) as opinions_24h,
      COUNT(CASE WHEN created_at >= datetime('now', '-7 days') THEN 1 END) as opinions_7d
    FROM opinions
  `).get() as any;

  const newAgents7d = (sqlite.prepare(`
    SELECT COUNT(*) as count FROM agents WHERE created_at >= datetime('now', '-7 days')
  `).get() as any).count;

  const totalAgents = rows.length;

  const retentionData = sqlite.prepare(`
    SELECT
      COUNT(CASE WHEN last_active >= datetime('now', '-1 day') THEN 1 END) as active_24h,
      COUNT(CASE WHEN last_active < datetime('now', '-1 day') AND last_active >= datetime('now', '-7 days') THEN 1 END) as active_7d_only
    FROM (
      SELECT agent_id, MAX(created_at) as last_active FROM opinions GROUP BY agent_id
    )
  `).get() as any;

  const active24h = retentionData.active_24h;
  const active7d = retentionData.active_7d_only;
  const olderOrInactive = totalAgents - active24h - active7d;

  return {
    leaderboard: limited,
    inactive_count: inactiveCount,
    recent_activity: {
      opinions_24h: recentActivity.opinions_24h,
      opinions_7d: recentActivity.opinions_7d,
      new_agents_7d: newAgents7d,
    },
    retention: {
      active_24h: active24h,
      active_7d: active7d,
      older_or_inactive: olderOrInactive,
      total: totalAgents,
    },
  };
}

export function getMarketAnalytics(sort: string = 'created_at') {
  const rows = sqlite.prepare(`
    SELECT
      m.id,
      m.question,
      m.category,
      m.status,
      m.majority_position,
      m.answer_type,
      m.deadline,
      m.created_at,
      m.created_by,
      m.creator_type,
      m.research_theme,
      m.max_participants,
      m.tags,
      m.scheduled_start,
      COALESCE(o_agg.opinion_count, 0) as opinion_count,
      COALESCE(o_agg.participant_count, 0) as participant_count,
      COALESCE(pt_agg.points_distributed, 0) as points_distributed
    FROM markets m
    LEFT JOIN (
      SELECT market_id,
        COUNT(*) as opinion_count,
        COUNT(DISTINCT agent_id) as participant_count
      FROM opinions
      GROUP BY market_id
    ) o_agg ON m.id = o_agg.market_id
    LEFT JOIN (
      SELECT market_id,
        SUM(amount) as points_distributed
      FROM point_transactions
      GROUP BY market_id
    ) pt_agg ON m.id = pt_agg.market_id
  `).all() as any[];

  const marketList = rows.map((r) => ({
    id: r.id,
    question: r.question,
    category: r.category,
    status: r.status,
    majority_position: r.majority_position,
    answer_type: r.answer_type || 'binary',
    deadline: r.deadline,
    created_at: r.created_at,
    created_by: r.created_by,
    creator_type: r.creator_type || (r.created_by === 'lifecycle' ? 'system' : r.created_by === 'admin' ? 'admin' : 'agent'),
    research_theme: r.research_theme,
    max_participants: r.max_participants ?? null,
    tags: r.tags ?? null,
    scheduled_start: r.scheduled_start ?? null,
    opinion_count: r.opinion_count,
    participant_count: r.participant_count,
    points_distributed: r.points_distributed,
  }));

  const sortMap: Record<string, string> = {
    opinions: 'opinion_count',
    participants: 'participant_count',
    points: 'points_distributed',
  };
  const key = sortMap[sort] || sort;

  marketList.sort((a: any, b: any) => {
    const av = a[key], bv = b[key];
    if (typeof av === 'number' && typeof bv === 'number') return bv - av;
    return String(bv).localeCompare(String(av));
  });

  return { markets: marketList };
}

export function getMarketDetail(marketId: string) {
  const market = sqlite.prepare('SELECT * FROM markets WHERE id = ?').get(marketId) as any;
  if (!market) return null;

  const { context_json, answer_options: aoJson, response_constraints: rcJson, ...rest } = market;
  const parsedMarket = {
    ...rest,
    context: normalizeContextForResponse(safeJsonParse(context_json, EMPTY_MARKET_CONTEXT)),
    answer_options: aoJson ? safeJsonParse(aoJson, null) : null,
    response_constraints: rcJson ? safeJsonParse(rcJson, null) : null,
  };

  const opinionCols = new Set(
    (sqlite.pragma('table_info(opinions)') as Array<{ name: string }>).map(c => c.name),
  );
  const provenanceJsonSelect = opinionCols.has('provenance_json') ? 'o.provenance_json' : 'NULL as provenance_json';
  const provenanceScoreSelect = opinionCols.has('provenance_score') ? 'o.provenance_score' : 'NULL as provenance_score';
  const confidenceSelect = opinionCols.has('confidence') ? 'o.confidence' : 'NULL as confidence';

  const opinions = sqlite.prepare(`
    SELECT o.id, o.agent_id, a.handle, o.answer, ${confidenceSelect}, o.basis, o.created_at, ${provenanceJsonSelect}, ${provenanceScoreSelect}
    FROM opinions o
    LEFT JOIN agents a ON o.agent_id = a.id
    WHERE o.market_id = ?
    ORDER BY o.created_at ASC
  `).all(marketId) as any[];

  const transactions = sqlite.prepare(`
    SELECT pt.id, pt.agent_id, a.handle, pt.amount, pt.type, pt.created_at
    FROM point_transactions pt
    LEFT JOIN agents a ON pt.agent_id = a.id
    WHERE pt.market_id = ?
    ORDER BY pt.created_at ASC
  `).all(marketId) as any[];

  const voteCounts: Record<string, number> = {};
  const agentIds = new Set<string>();
  const provenanceSourceCounts: Record<string, number> = {};
  const provenanceScores: number[] = [];
  const provenanceScoreBuckets = { '0-0.4': 0, '0.4-0.7': 0, '0.7-1.0': 0, unknown: 0 };
  const provenanceAlignment = { aligned: 0, missing_expected: 0, misaligned: 0 };
  const normalizedProvenance = new Map<string, { payload: ProvenancePayload | null; sources: ProvenancePayload['sources'] }>();

  for (const o of opinions) {
    const normalized = normalizeProvenance(o.provenance_json);
    normalizedProvenance.set(o.id, normalized);

    voteCounts[o.answer] = (voteCounts[o.answer] || 0) + 1;
    agentIds.add(o.agent_id);
    if (o.provenance_score !== null && o.provenance_score !== undefined) {
      const score = Number(o.provenance_score);
      if (!Number.isNaN(score)) {
        provenanceScores.push(score);
        if (score < 0.4) provenanceScoreBuckets['0-0.4']++;
        else if (score < 0.7) provenanceScoreBuckets['0.4-0.7']++;
        else provenanceScoreBuckets['0.7-1.0']++;
      } else {
        provenanceScoreBuckets.unknown++;
      }
    } else {
      provenanceScoreBuckets.unknown++;
    }

    const sources = normalized.sources;
    if (sources && sources.length > 0) {
      for (const source of sources) {
        const type = typeof source?.type === 'string' ? source.type : 'unknown';
        provenanceSourceCounts[type] = (provenanceSourceCounts[type] || 0) + 1;
      }
      const provenancePayload: ProvenancePayload = { sources };
      const scoreDetail = computeProvenanceScore(provenancePayload, parsedMarket.knowledge_source || 'any');
      if (!scoreDetail.missing_expected && !scoreDetail.misaligned) {
        provenanceAlignment.aligned++;
      } else {
        if (scoreDetail.missing_expected) provenanceAlignment.missing_expected++;
        if (scoreDetail.misaligned) provenanceAlignment.misaligned++;
      }
    }
  }

  // Look up creator handle if created by an agent
  let creatorHandle: string | null = null;
  if (parsedMarket.created_by && parsedMarket.created_by !== 'lifecycle' && parsedMarket.created_by !== 'admin') {
    const creator = sqlite.prepare('SELECT handle FROM agents WHERE id = ?').get(parsedMarket.created_by) as any;
    if (creator) creatorHandle = creator.handle;
  }

  return {
    market: parsedMarket,
    creator_handle: creatorHandle,
    opinions: opinions.map((o: any) => ({
      ...o,
      provenance: normalizedProvenance.get(o.id)?.payload ?? null,
    })),
    vote_counts: voteCounts,
    participant_count: agentIds.size,
    transactions,
    provenance: {
      average_score: provenanceScores.length > 0
        ? parseFloat((provenanceScores.reduce((s, v) => s + v, 0) / provenanceScores.length).toFixed(2))
        : null,
      score_distribution: provenanceScoreBuckets,
      source_counts: provenanceSourceCounts,
      alignment_counts: provenanceAlignment,
    },
    total_points: transactions.reduce((sum: number, t: any) => sum + t.amount, 0),
  };
}

/** Universal 5-stage insight readiness rubric — identical for every surface topic */
export const INSIGHT_STAGES = [
  { stage: 1, name: 'Seeded',      minResolved: 0  },
  { stage: 2, name: 'Gathering',   minResolved: 5  },
  { stage: 3, name: 'Emerging',    minResolved: 10 },
  { stage: 4, name: 'Converging',  minResolved: 25 },
  { stage: 5, name: 'Synthesized', minResolved: 40 },
] as const;

/** Determine insight readiness stage from resolved count, participation, consensus, and admin confirmation */
function determineStage(resolvedCount: number, avgParticipation: number, consensusRate: number, adminConfirmed: boolean = false): number {
  let currentStage = 1;
  if (resolvedCount >= 5) currentStage = 2;
  if (resolvedCount >= 10 && avgParticipation >= 3.0) currentStage = 3;
  if (resolvedCount >= 25 && consensusRate >= 0.5) currentStage = 4;
  if (resolvedCount >= 40 && adminConfirmed) currentStage = 5;
  return currentStage;
}

function isFunnelConfirmed(funnelId: string): boolean {
  const row = sqlite.prepare('SELECT 1 FROM funnel_confirmations WHERE funnel_id = ?').get(funnelId) as any;
  return !!row;
}

function marketBelongsToFunnel(m: { research_theme: string | null; tags: string | null }, funnelId: string): { match: boolean; is_bridge: boolean } {
  if (m.research_theme === funnelId) return { match: true, is_bridge: false };
  if (m.tags) {
    try {
      const tags = JSON.parse(m.tags);
      if (Array.isArray(tags) && tags.includes(funnelId)) return { match: true, is_bridge: true };
    } catch { /* skip */ }
  }
  return { match: false, is_bridge: false };
}

export async function getFunnelDetail(funnelId: string) {
  const theme = await getFunnelById(funnelId);
  if (!theme) return null;

  const rows = sqlite.prepare(`
    SELECT
      m.id, m.question, m.description, m.category, m.status, m.answer_type,
      m.research_theme, m.tags, m.majority_position, m.created_at, m.deadline,
      COALESCE(o_agg.opinion_count, 0) as opinion_count,
      COALESCE(o_agg.participant_count, 0) as participant_count
    FROM markets m
    LEFT JOIN (
      SELECT market_id,
        COUNT(*) as opinion_count,
        COUNT(DISTINCT agent_id) as participant_count
      FROM opinions
      GROUP BY market_id
    ) o_agg ON m.id = o_agg.market_id
  `).all() as any[];

  const funnelMarkets: any[] = [];
  const allAgentIds = new Set<string>();
  let totalOpinions = 0;
  let resolvedCount = 0;
  let openCount = 0;
  let closedCount = 0;

  for (const r of rows) {
    const { match, is_bridge } = marketBelongsToFunnel(r, funnelId);
    if (!match) continue;

    funnelMarkets.push({
      id: r.id,
      question: r.question,
      description: r.description,
      category: r.category,
      status: r.status,
      answer_type: r.answer_type || 'binary',
      research_theme: r.research_theme,
      is_bridge,
      opinion_count: r.opinion_count,
      participant_count: r.participant_count,
      majority_position: r.majority_position,
      created_at: r.created_at,
      deadline: r.deadline,
    });

    totalOpinions += r.opinion_count;
    if (r.status === 'resolved') resolvedCount++;
    else if (r.status === 'open') openCount++;
    else if (r.status === 'closed') closedCount++;
  }

  // Get unique participants across all funnel markets
  if (funnelMarkets.length > 0) {
    const marketIds = funnelMarkets.map(m => m.id);
    const placeholders = marketIds.map(() => '?').join(',');
    const agentRows = sqlite.prepare(
      `SELECT DISTINCT agent_id FROM opinions WHERE market_id IN (${placeholders})`
    ).all(...marketIds) as any[];
    for (const a of agentRows) allAgentIds.add(a.agent_id);
  }

  // Compute statistical metrics for stage determination
  const resolvedMarkets = funnelMarkets.filter((m: any) => m.status === 'resolved');
  const resolvedOpinions = resolvedMarkets.reduce((sum: number, m: any) => sum + m.opinion_count, 0);
  const avgParticipation = resolvedCount > 0 ? resolvedOpinions / resolvedCount : 0;

  // Consensus rate: % of resolved markets where top answer has >= 60% share
  let consensusCount = 0;
  if (resolvedMarkets.length > 0) {
    const resolvedIds = resolvedMarkets.map((m: any) => m.id);
    const placeholders = resolvedIds.map(() => '?').join(',');
    const opinionRows = sqlite.prepare(
      `SELECT market_id, answer, COUNT(*) as cnt
       FROM opinions
       WHERE market_id IN (${placeholders})
       GROUP BY market_id, answer`
    ).all(...resolvedIds) as any[];

    const marketAnswerCounts = new Map<string, { total: number; max: number }>();
    for (const row of opinionRows) {
      const entry = marketAnswerCounts.get(row.market_id) || { total: 0, max: 0 };
      entry.total += row.cnt;
      entry.max = Math.max(entry.max, row.cnt);
      marketAnswerCounts.set(row.market_id, entry);
    }
    for (const [, counts] of marketAnswerCounts) {
      if (counts.total > 0 && (counts.max / counts.total) >= 0.6) {
        consensusCount++;
      }
    }
  }
  const consensusRate = resolvedCount > 0 ? consensusCount / resolvedCount : 0;

  // Opinion distribution aggregate
  const opinionDistribution: Record<string, number> = { yes: 0, no: 0, abstain: 0, other: 0 };
  if (funnelMarkets.length > 0) {
    const allIds = funnelMarkets.map((m: any) => m.id);
    const ph = allIds.map(() => '?').join(',');
    const distRows = sqlite.prepare(
      `SELECT answer, COUNT(*) as cnt FROM opinions WHERE market_id IN (${ph}) GROUP BY answer`
    ).all(...allIds) as any[];
    for (const r of distRows) {
      if (r.answer === 'yes') opinionDistribution.yes = r.cnt;
      else if (r.answer === 'no') opinionDistribution.no = r.cnt;
      else if (r.answer === 'abstain') opinionDistribution.abstain = r.cnt;
      else opinionDistribution.other += r.cnt;
    }
  }

  // Top majority positions across resolved markets
  const positionCounts: Record<string, number> = {};
  for (const m of resolvedMarkets) {
    if (m.majority_position) {
      positionCounts[m.majority_position] = (positionCounts[m.majority_position] || 0) + 1;
    }
  }
  const topMajorityPositions = Object.entries(positionCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 10)
    .map(([position, count]) => ({ position, count }));

  // Stage determination
  const adminConfirmed = isFunnelConfirmed(funnelId);
  const currentStage = determineStage(resolvedCount, avgParticipation, consensusRate, adminConfirmed);

  // Sort markets by created_at desc
  funnelMarkets.sort((a: any, b: any) => b.created_at.localeCompare(a.created_at));

  const targetResolved = theme.target_resolved || 40;
  return {
    funnel_id: funnelId,
    name: theme.display_insight_name || theme.name,
    description: theme.description,
    insight_goal: theme.insight_goal,
    stages: INSIGHT_STAGES,
    markets: funnelMarkets,
    total_markets: funnelMarkets.length,
    resolved_count: resolvedCount,
    open_count: openCount,
    closed_count: closedCount,
    total_opinions: totalOpinions,
    total_participants: allAgentIds.size,
    current_stage: currentStage,
    admin_confirmed: adminConfirmed,
    avg_participation: Math.round(avgParticipation * 10) / 10,
    consensus_rate: Math.round(consensusRate * 100),
    consensus_count: consensusCount,
    opinion_distribution: opinionDistribution,
    top_majority_positions: topMajorityPositions,
    target_resolved: targetResolved,
    markets_to_full_insight: Math.max(0, targetResolved - resolvedCount),
  };
}

export async function getFunnelOverviews() {
  const funnels = (await getAllFunnels()).filter((f: ResearchFunnel) => f.status !== 'archived');

  const rows = sqlite.prepare(
    `SELECT id, research_theme, tags, status FROM markets`
  ).all() as any[];

  // Count opinions per funnel
  const opinionRows = sqlite.prepare(
    `SELECT m.id, m.research_theme, m.tags, COUNT(o.id) as cnt
     FROM markets m
     JOIN opinions o ON m.id = o.market_id
     GROUP BY m.id`
  ).all() as any[];

  return funnels.map(funnel => {
    const funnelId = funnel.id;
    let totalMarkets = 0;
    let resolvedCount = 0;
    let totalOpinions = 0;

    for (const r of rows) {
      if (!marketBelongsToFunnel(r, funnelId).match) continue;
      totalMarkets++;
      if (r.status === 'resolved') resolvedCount++;
    }

    for (const r of opinionRows) {
      if (!marketBelongsToFunnel(r, funnelId).match) continue;
      totalOpinions += r.cnt;
    }

    const avgParticipation = resolvedCount > 0 ? totalOpinions / resolvedCount : 0;
    const confirmed = isFunnelConfirmed(funnelId);
    return {
      funnel_id: funnelId,
      name: funnel.display_insight_name || funnel.name,
      insight_goal: funnel.insight_goal,
      total_markets: totalMarkets,
      resolved_count: resolvedCount,
      target_resolved: funnel.target_resolved,
      current_stage: determineStage(resolvedCount, avgParticipation, 1.0, confirmed),
      total_opinions: totalOpinions,
      avg_participation: Math.round(avgParticipation * 10) / 10,
    };
  });
}

export function getPointsTimeSeries(days: number | null) {
  const query = days
    ? sqlite.prepare(`
        SELECT DATE(created_at) as day,
          SUM(CASE WHEN type IN ('pool_reward','participation') THEN amount ELSE 0 END) as participant_points,
          SUM(CASE WHEN type = 'platform_fee' THEN amount ELSE 0 END) as protocol_points
        FROM point_transactions
        WHERE created_at >= datetime('now', '-' || ? || ' days')
        GROUP BY DATE(created_at)
        ORDER BY day ASC
      `)
    : sqlite.prepare(`
        SELECT DATE(created_at) as day,
          SUM(CASE WHEN type IN ('pool_reward','participation') THEN amount ELSE 0 END) as participant_points,
          SUM(CASE WHEN type = 'platform_fee' THEN amount ELSE 0 END) as protocol_points
        FROM point_transactions
        GROUP BY DATE(created_at)
        ORDER BY day ASC
      `);

  const rows = (days ? query.all(days) : query.all()) as any[];
  return { days: rows };
}

export function getAgentActivityTimeSeries(days: number | null) {
  // Get first opinion date per agent
  const firstOpinionQuery = sqlite.prepare(`
    SELECT agent_id, DATE(MIN(created_at)) as first_day
    FROM opinions GROUP BY agent_id
  `);
  const firstOpinionRows = firstOpinionQuery.all() as any[];
  const firstOpinionMap = new Map<string, string>();
  for (const r of firstOpinionRows) {
    firstOpinionMap.set(r.agent_id, r.first_day);
  }

  // Get daily activity
  const activityQuery = days
    ? sqlite.prepare(`
        SELECT DATE(created_at) as day, agent_id
        FROM opinions
        WHERE created_at >= datetime('now', '-' || ? || ' days')
        GROUP BY DATE(created_at), agent_id
      `)
    : sqlite.prepare(`
        SELECT DATE(created_at) as day, agent_id
        FROM opinions
        GROUP BY DATE(created_at), agent_id
      `);
  const activityRows = (days ? activityQuery.all(days) : activityQuery.all()) as any[];

  // Group activity by day
  const dayMap = new Map<string, { new_agents: number; returning_agents: number }>();
  for (const r of activityRows) {
    if (!dayMap.has(r.day)) dayMap.set(r.day, { new_agents: 0, returning_agents: 0 });
    const entry = dayMap.get(r.day)!;
    const firstDay = firstOpinionMap.get(r.agent_id);
    if (firstDay === r.day) {
      entry.new_agents++;
    } else {
      entry.returning_agents++;
    }
  }

  // Get churned agents: last opinion was >30 days ago, project churn to that date + 30 days
  const churnQuery = days
    ? sqlite.prepare(`
        SELECT DATE(last_active, '+30 days') as churn_day, COUNT(*) as churned
        FROM (
          SELECT agent_id, DATE(MAX(created_at)) as last_active
          FROM opinions
          GROUP BY agent_id
        )
        WHERE DATE(last_active, '+30 days') >= DATE('now', '-' || ? || ' days')
          AND DATE(last_active, '+30 days') <= DATE('now')
        GROUP BY churn_day
      `)
    : sqlite.prepare(`
        SELECT DATE(last_active, '+30 days') as churn_day, COUNT(*) as churned
        FROM (
          SELECT agent_id, DATE(MAX(created_at)) as last_active
          FROM opinions
          GROUP BY agent_id
        )
        WHERE DATE(last_active, '+30 days') <= DATE('now')
        GROUP BY churn_day
      `);
  const churnRows = (days ? churnQuery.all(days) : churnQuery.all()) as any[];
  const churnMap = new Map<string, number>();
  for (const r of churnRows) {
    churnMap.set(r.churn_day, r.churned);
  }

  // Merge into sorted array
  const allDays = new Set<string>();
  for (const d of dayMap.keys()) allDays.add(d);
  for (const d of churnMap.keys()) allDays.add(d);
  const sorted = [...allDays].sort();

  const buckets = sorted.map(day => {
    const activity = dayMap.get(day) || { new_agents: 0, returning_agents: 0 };
    const churned = churnMap.get(day) || 0;
    return {
      day,
      new_agents: activity.new_agents,
      returning_agents: activity.returning_agents,
      churned_agents: churned,
    };
  });

  return { buckets };
}

// Filter-aware activity time series: same shape as getAgentActivityTimeSeries
// but restricted to a specific set of agent IDs.
export function getAgentActivityTimeSeriesForAgents(
  agentIds: string[],
  days: number
): Array<{ day: string; new_agents: number; returning_agents: number }> {
  if (agentIds.length === 0) return [];
  const placeholders = agentIds.map(() => '?').join(',');

  const firstOpinionRows = sqlite
    .prepare(
      `SELECT agent_id, DATE(MIN(created_at)) as first_day
       FROM opinions
       WHERE agent_id IN (${placeholders})
       GROUP BY agent_id`
    )
    .all(...agentIds) as Array<{ agent_id: string; first_day: string }>;
  const firstOpinionMap = new Map(firstOpinionRows.map(r => [r.agent_id, r.first_day]));

  const activityRows = sqlite
    .prepare(
      `SELECT DATE(created_at) as day, agent_id
       FROM opinions
       WHERE created_at >= datetime('now', '-' || ? || ' days')
         AND agent_id IN (${placeholders})
       GROUP BY DATE(created_at), agent_id`
    )
    .all(days, ...agentIds) as Array<{ day: string; agent_id: string }>;

  const dayMap = new Map<string, { new_agents: number; returning_agents: number }>();
  for (const r of activityRows) {
    let entry = dayMap.get(r.day);
    if (!entry) {
      entry = { new_agents: 0, returning_agents: 0 };
      dayMap.set(r.day, entry);
    }
    if (firstOpinionMap.get(r.agent_id) === r.day) entry.new_agents++;
    else entry.returning_agents++;
  }

  return [...dayMap.entries()]
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([day, v]) => ({ day, new_agents: v.new_agents, returning_agents: v.returning_agents }));
}

export interface AgentDirectoryDashboard {
  kpis: {
    total: number;
    fully_registered: number;
    fully_registered_pct: number;
    active_24h: number;
    active_7d: number;
    median_points: number;
    median_opinions: number;
  };
  registration: { full: number; partial: number; none: number };
  type_by_registration: Array<{ type: string; full: number; partial: number; none: number }>;
  points_distribution: Array<{ bucket: string; count: number }>;
  top_points: Array<{ agent_id: string; handle: string; points_balance: number }>;
  activity_timeseries: Array<{ day: string; new_agents: number; returning_agents: number }>;
  opinions_distribution: Array<{ bucket: string; count: number }>;
}

export async function getAgentDirectoryDashboard(
  filters: ClassifiedAgentFilters = {}
): Promise<AgentDirectoryDashboard> {
  // Ignore pagination/sort — we aggregate over the full filtered set.
  const baseFilters: ClassifiedAgentFilters = { ...filters };
  delete baseFilters.limit;
  delete baseFilters.offset;
  delete baseFilters.sort;

  const { agents: classified } = await getClassifiedAgents(baseFilters);
  const agentIds = classified.map(a => a.agent_id);
  const total = classified.length;

  // Registration buckets
  const registration = { full: 0, partial: 0, none: 0 };
  for (const a of classified) {
    if (a.registration_completed_pct >= 100) registration.full++;
    else if (a.registration_completed_pct > 0) registration.partial++;
    else registration.none++;
  }

  // Type × registration crosstab
  const typeMap = new Map<string, { full: number; partial: number; none: number }>();
  for (const a of classified) {
    const t = a.derived_agent_type || 'unknown';
    let entry = typeMap.get(t);
    if (!entry) {
      entry = { full: 0, partial: 0, none: 0 };
      typeMap.set(t, entry);
    }
    if (a.registration_completed_pct >= 100) entry.full++;
    else if (a.registration_completed_pct > 0) entry.partial++;
    else entry.none++;
  }
  const type_by_registration = [...typeMap.entries()]
    .map(([type, v]) => ({ type, full: v.full, partial: v.partial, none: v.none }))
    .sort((a, b) => b.full + b.partial + b.none - (a.full + a.partial + a.none));

  // Points distribution
  const pointBuckets: Array<{ label: string; test: (p: number) => boolean }> = [
    { label: '0', test: p => p === 0 },
    { label: '1-100', test: p => p > 0 && p <= 100 },
    { label: '101-500', test: p => p > 100 && p <= 500 },
    { label: '501-1k', test: p => p > 500 && p <= 1000 },
    { label: '1k-5k', test: p => p > 1000 && p <= 5000 },
    { label: '5k+', test: p => p > 5000 },
  ];
  const points_distribution = pointBuckets.map(b => ({
    bucket: b.label,
    count: classified.filter(a => b.test(a.points_balance)).length,
  }));

  // Opinions-per-agent distribution
  const opinionBuckets: Array<{ label: string; test: (n: number) => boolean }> = [
    { label: '0', test: n => n === 0 },
    { label: '1-5', test: n => n >= 1 && n <= 5 },
    { label: '6-20', test: n => n >= 6 && n <= 20 },
    { label: '21-50', test: n => n >= 21 && n <= 50 },
    { label: '51-100', test: n => n >= 51 && n <= 100 },
    { label: '100+', test: n => n > 100 },
  ];
  const opinions_distribution = opinionBuckets.map(b => ({
    bucket: b.label,
    count: classified.filter(a => b.test(a.total_opinions)).length,
  }));

  // Top 10 by points
  const top_points = [...classified]
    .sort((a, b) => b.points_balance - a.points_balance)
    .slice(0, 10)
    .map(a => ({ agent_id: a.agent_id, handle: a.handle, points_balance: a.points_balance }));

  // Medians
  const median = (arr: number[]): number => {
    if (!arr.length) return 0;
    const sorted = [...arr].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? Math.round((sorted[mid - 1] + sorted[mid]) / 2)
      : sorted[mid];
  };
  const median_points = median(classified.map(a => a.points_balance));
  const median_opinions = median(classified.map(a => a.total_opinions));

  // Active 24h / 7d (restricted to the filter set)
  let active_24h = 0;
  let active_7d = 0;
  if (agentIds.length > 0) {
    const placeholders = agentIds.map(() => '?').join(',');
    const ago24h = new Date(Date.now() - 24 * 3600 * 1000).toISOString();
    const ago7d = new Date(Date.now() - 7 * 24 * 3600 * 1000).toISOString();
    active_24h = (sqlite
      .prepare(
        `SELECT COUNT(DISTINCT agent_id) as c FROM opinions
         WHERE created_at >= ? AND agent_id IN (${placeholders})`
      )
      .get(ago24h, ...agentIds) as { c: number }).c;
    active_7d = (sqlite
      .prepare(
        `SELECT COUNT(DISTINCT agent_id) as c FROM opinions
         WHERE created_at >= ? AND agent_id IN (${placeholders})`
      )
      .get(ago7d, ...agentIds) as { c: number }).c;
  }

  const activity_timeseries = getAgentActivityTimeSeriesForAgents(agentIds, 30);

  const fully_registered_pct = total > 0 ? Math.round((registration.full / total) * 100) : 0;

  return {
    kpis: {
      total,
      fully_registered: registration.full,
      fully_registered_pct,
      active_24h,
      active_7d,
      median_points,
      median_opinions,
    },
    registration,
    type_by_registration,
    points_distribution,
    top_points,
    activity_timeseries,
    opinions_distribution,
  };
}

export function confirmFunnelSynthesized(funnelId: string) {
  sqlite.prepare(
    `INSERT OR REPLACE INTO funnel_confirmations (funnel_id, confirmed_at) VALUES (?, ?)`
  ).run(funnelId, new Date().toISOString());
}

export function getGeographicBreakdown(country?: string) {
  let query: string;
  const params: string[] = [];

  if (country) {
    query = `
      SELECT location_country, location_region, COUNT(*) as agent_count
      FROM agents
      WHERE location_country = ?
      GROUP BY location_country, location_region
      ORDER BY agent_count DESC
    `;
    params.push(country.toUpperCase());
  } else {
    query = `
      SELECT location_country, COUNT(*) as agent_count
      FROM agents
      WHERE location_country IS NOT NULL AND location_country != ''
      GROUP BY location_country
      ORDER BY agent_count DESC
    `;
  }

  const rows = sqlite.prepare(query).all(...params) as any[];

  const totalWithLocation = (sqlite.prepare(
    "SELECT COUNT(*) as count FROM agents WHERE location_country IS NOT NULL AND location_country != ''"
  ).get() as any).count;
  const totalAgents = (sqlite.prepare('SELECT COUNT(*) as count FROM agents WHERE is_active = 1').get() as any).count;

  return {
    breakdown: rows,
    total_with_location: totalWithLocation,
    total_agents: totalAgents,
    coverage_pct: totalAgents > 0 ? Math.round((totalWithLocation / totalAgents) * 100) : 0,
  };
}
