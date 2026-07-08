import { db } from '../db/index.js';
import { agents, opinions, markets, profileAnswers, agentClassifications } from '../db/schema.js';
import { eq, sql, inArray } from 'drizzle-orm';
import { getClassifiedAgents, type ClassifiedAgent } from './classification.js';

// ── Types ────────────────────────────────────────────────────────────────

export interface MarketFilter {
  category?: string;
  status?: string;
  /** Keep only markets tagged with at least one of these (markets.tags JSON array). */
  tags?: string[];
}

export interface CohortComparisonRequest {
  cohorts: Array<{ label: string; agent_ids: string[] }>;
  market_filter?: MarketFilter;
}

export function marketMatchesFilter(
  market: { category: string; status: string; tags: string | null },
  filter?: MarketFilter,
): boolean {
  if (!filter) return true;
  if (filter.category && market.category !== filter.category) return false;
  if (filter.status && filter.status !== 'all' && market.status !== filter.status) return false;
  if (filter.tags && filter.tags.length > 0) {
    let marketTags: string[] = [];
    try {
      const parsed = market.tags ? JSON.parse(market.tags) : [];
      if (Array.isArray(parsed)) marketTags = parsed.map(String);
    } catch { /* unparseable tags → no match */ }
    if (!filter.tags.some(t => marketTags.includes(t))) return false;
  }
  return true;
}

export interface AgentDetail {
  agent_id: string;
  handle: string;
  avatar_url: string | null;
  opinion_style: string;
  primary_domain: string | null;
  domain_tags: string[];
  consensus_alignment: number;
  contrarian_rate: number;
  custom_instructions: string | null;
  custom_objective: string | null;
  profile_answers: Record<string, string>;
  total_opinions: number;
  participation_rate: number;
}

export interface CohortSummary {
  label: string;
  agent_count: number;
  agents: AgentDetail[];
  aggregate: {
    avg_confidence: number;
    confidence_std_dev: number;
    style_distribution: Record<string, number>;
    domain_coverage: string[];
    total_opinions: number;
    avg_participation_rate: number;
  };
}

export interface CohortPosition {
  cohort_label: string;
  opinions: Array<{
    agent_handle: string;
    answer: string;
    confidence: number | null;
    basis: string | null;
  }>;
  majority_answer: string;
  avg_confidence: number;
  answer_distribution: Record<string, number>;
}

export interface CommonMarketComparison {
  market_id: string;
  question: string;
  category: string;
  status: string;
  resolved_answer: string | null;
  cohort_positions: CohortPosition[];
  divergence_score: number;
}

export interface DivergenceHighlight {
  market_question: string;
  market_id: string;
  type: 'opposite_positions' | 'confidence_gap' | 'unanimous_vs_split';
  description: string;
  cohorts: Array<{ label: string; majority: string; avg_confidence: number; sample_basis: string | null }>;
}

export interface ConfidenceAnalysis {
  per_cohort: Array<{
    label: string;
    mean: number;
    median: number;
    std_dev: number;
    high_confidence_pct: number;
    low_confidence_pct: number;
    total_with_confidence: number;
  }>;
  interpretation: string;
}

export interface CohortComparisonResult {
  cohorts: CohortSummary[];
  common_markets: CommonMarketComparison[];
  divergence_highlights: DivergenceHighlight[];
  confidence_analysis: ConfidenceAnalysis;
}

// ── Main comparison logic ────────────────────────────────────────────────

export async function generateCohortComparison(request: CohortComparisonRequest): Promise<CohortComparisonResult> {
  const allAgentIds = request.cohorts.flatMap(c => c.agent_ids);
  if (allAgentIds.length === 0) {
    return { cohorts: [], common_markets: [], divergence_highlights: [], confidence_analysis: { per_cohort: [], interpretation: 'No agents selected.' } };
  }

  // Build agent_id → cohort label map
  const agentCohortMap = new Map<string, string>();
  for (const cohort of request.cohorts) {
    for (const id of cohort.agent_ids) {
      agentCohortMap.set(id, cohort.label);
    }
  }

  // Fetch agent data, classifications, profile answers, and opinions in parallel
  const [agentRows, classificationRows, profileRows, opinionRows, marketRows] = await Promise.all([
    db.select().from(agents).where(inArray(agents.id, allAgentIds)),
    db.select().from(agentClassifications).where(inArray(agentClassifications.agent_id, allAgentIds)),
    db.select().from(profileAnswers).where(inArray(profileAnswers.agent_id, allAgentIds)),
    db.select().from(opinions).where(inArray(opinions.agent_id, allAgentIds)),
    db.select().from(markets),
  ]);

  // Index data
  const agentMap = new Map(agentRows.map(a => [a.id, a]));
  const classMap = new Map(classificationRows.map(c => [c.agent_id, c]));
  const marketMap = new Map(marketRows.map(m => [m.id, m]));

  // Profile answers grouped by agent
  const profileMap = new Map<string, Record<string, string>>();
  for (const pa of profileRows) {
    if (!profileMap.has(pa.agent_id)) profileMap.set(pa.agent_id, {});
    profileMap.get(pa.agent_id)![pa.question_key] = pa.answer;
  }

  // Total markets count for participation rate
  const totalMarketCount = marketRows.length;

  // ── Build cohort summaries ─────────────────────────────────────────
  const cohortSummaries: CohortSummary[] = [];
  const agentDetailMap = new Map<string, AgentDetail>();

  for (const cohort of request.cohorts) {
    const cohortAgents: AgentDetail[] = [];
    const styleDist: Record<string, number> = {};
    const domainSet = new Set<string>();

    for (const agentId of cohort.agent_ids) {
      const agent = agentMap.get(agentId);
      if (!agent) continue;
      const cls = classMap.get(agentId);
      const domains: string[] = cls?.domain_tags ? JSON.parse(cls.domain_tags) : [];
      const agentOpinionCount = opinionRows.filter(o => o.agent_id === agentId).length;

      const detail: AgentDetail = {
        agent_id: agentId,
        handle: agent.handle,
        avatar_url: agent.avatar_url,
        opinion_style: cls?.opinion_style ?? 'unknown',
        primary_domain: cls?.primary_domain ?? null,
        domain_tags: domains,
        consensus_alignment: cls?.consensus_alignment ?? 0,
        contrarian_rate: cls?.contrarian_rate ?? 0,
        custom_instructions: agent.custom_instructions ?? null,
        custom_objective: agent.custom_objective ?? null,
        profile_answers: profileMap.get(agentId) ?? {},
        total_opinions: agentOpinionCount,
        participation_rate: totalMarketCount > 0 ? Math.round((agentOpinionCount / totalMarketCount) * 100) : 0,
      };

      cohortAgents.push(detail);
      agentDetailMap.set(agentId, detail);

      // Aggregate
      styleDist[detail.opinion_style] = (styleDist[detail.opinion_style] || 0) + 1;
      for (const d of domains) domainSet.add(d);
    }

    // Compute aggregate confidence from this cohort's opinions
    const cohortOpinions = opinionRows.filter(o => cohort.agent_ids.includes(o.agent_id));
    const confidences = cohortOpinions.map(o => o.confidence).filter((c): c is number => c != null);
    const avgConf = confidences.length > 0 ? confidences.reduce((s, c) => s + c, 0) / confidences.length : 0;
    const confStdDev = confidences.length > 1
      ? Math.sqrt(confidences.reduce((s, c) => s + (c - avgConf) ** 2, 0) / confidences.length)
      : 0;

    cohortSummaries.push({
      label: cohort.label,
      agent_count: cohortAgents.length,
      agents: cohortAgents,
      aggregate: {
        avg_confidence: Math.round(avgConf * 10) / 10,
        confidence_std_dev: Math.round(confStdDev * 10) / 10,
        style_distribution: styleDist,
        domain_coverage: Array.from(domainSet).sort(),
        total_opinions: cohortOpinions.length,
        avg_participation_rate: cohortAgents.length > 0
          ? Math.round(cohortAgents.reduce((s, a) => s + a.participation_rate, 0) / cohortAgents.length)
          : 0,
      },
    });
  }

  // ── Find common markets ────────────────────────────────────────────
  // Group opinions by market, then keep markets where 2+ cohorts participated
  const opinionsByMarket = new Map<string, typeof opinionRows>();
  for (const op of opinionRows) {
    if (!opinionsByMarket.has(op.market_id)) opinionsByMarket.set(op.market_id, []);
    opinionsByMarket.get(op.market_id)!.push(op);
  }

  const commonMarkets: CommonMarketComparison[] = [];

  for (const [marketId, marketOpinions] of opinionsByMarket) {
    const market = marketMap.get(marketId);
    if (!market) continue;

    // Apply market filters
    if (!marketMatchesFilter(market, request.market_filter)) continue;

    // Group by cohort
    const cohortGroups = new Map<string, typeof marketOpinions>();
    for (const op of marketOpinions) {
      const cohortLabel = agentCohortMap.get(op.agent_id);
      if (!cohortLabel) continue;
      if (!cohortGroups.has(cohortLabel)) cohortGroups.set(cohortLabel, []);
      cohortGroups.get(cohortLabel)!.push(op);
    }

    // Need 2+ cohorts with opinions on this market
    if (cohortGroups.size < 2) continue;

    const cohortPositions: CohortPosition[] = [];
    for (const [label, ops] of cohortGroups) {
      const answerDist: Record<string, number> = {};
      for (const op of ops) {
        answerDist[op.answer] = (answerDist[op.answer] || 0) + 1;
      }
      const majorityAnswer = Object.entries(answerDist).sort((a, b) => b[1] - a[1])[0]?.[0] ?? '';
      const confs = ops.map(o => o.confidence).filter((c): c is number => c != null);
      const avgConf = confs.length > 0 ? Math.round(confs.reduce((s, c) => s + c, 0) / confs.length) : 0;

      cohortPositions.push({
        cohort_label: label,
        opinions: ops.map(op => ({
          agent_handle: agentMap.get(op.agent_id)?.handle ?? op.agent_id,
          answer: op.answer,
          confidence: op.confidence,
          basis: op.basis,
        })),
        majority_answer: majorityAnswer,
        avg_confidence: avgConf,
        answer_distribution: answerDist,
      });
    }

    const divergenceScore = computeDivergence(cohortPositions);

    commonMarkets.push({
      market_id: marketId,
      question: market.question,
      category: market.category,
      status: market.status,
      resolved_answer: market.majority_position,
      cohort_positions: cohortPositions,
      divergence_score: divergenceScore,
    });
  }

  // Sort by divergence descending
  commonMarkets.sort((a, b) => b.divergence_score - a.divergence_score);

  // ── Divergence highlights ──────────────────────────────────────────
  const divergenceHighlights = buildDivergenceHighlights(commonMarkets.slice(0, 10));

  // ── Confidence analysis ────────────────────────────────────────────
  const confidenceAnalysis = buildConfidenceAnalysis(request.cohorts, opinionRows, agentCohortMap);

  return {
    cohorts: cohortSummaries,
    common_markets: commonMarkets,
    divergence_highlights: divergenceHighlights,
    confidence_analysis: confidenceAnalysis,
  };
}

// ── Divergence computation ───────────────────────────────────────────────

function computeDivergence(positions: CohortPosition[]): number {
  if (positions.length < 2) return 0;

  // Collect all answer keys across cohorts
  const allAnswers = new Set<string>();
  for (const pos of positions) {
    for (const key of Object.keys(pos.answer_distribution)) allAnswers.add(key);
  }
  if (allAnswers.size === 0) return 0;

  // Normalize distributions to probability vectors
  const dists = positions.map(pos => {
    const total = Object.values(pos.answer_distribution).reduce((s, n) => s + n, 0);
    const vec: number[] = [];
    for (const answer of allAnswers) {
      vec.push(total > 0 ? (pos.answer_distribution[answer] || 0) / total : 0);
    }
    return vec;
  });

  // Average pairwise total variation distance, normalized to 0-100
  let totalDist = 0;
  let pairs = 0;
  for (let i = 0; i < dists.length; i++) {
    for (let j = i + 1; j < dists.length; j++) {
      let tvd = 0;
      for (let k = 0; k < dists[i].length; k++) {
        tvd += Math.abs(dists[i][k] - dists[j][k]);
      }
      totalDist += tvd / 2; // TVD is half the L1 distance
      pairs++;
    }
  }

  return pairs > 0 ? Math.round((totalDist / pairs) * 100) : 0;
}

// ── Divergence highlights builder ────────────────────────────────────────

function buildDivergenceHighlights(topMarkets: CommonMarketComparison[]): DivergenceHighlight[] {
  const highlights: DivergenceHighlight[] = [];

  for (const cm of topMarkets) {
    if (cm.cohort_positions.length < 2) continue;

    const majorities = cm.cohort_positions.map(p => p.majority_answer);
    const allSameMajority = majorities.every(m => m === majorities[0]);
    const avgConfs = cm.cohort_positions.map(p => p.avg_confidence);
    const confGap = Math.max(...avgConfs) - Math.min(...avgConfs);

    // Check for unanimous vs split
    const unanimousCohorts = cm.cohort_positions.filter(p => Object.keys(p.answer_distribution).length === 1);
    const splitCohorts = cm.cohort_positions.filter(p => Object.keys(p.answer_distribution).length > 1);

    let type: DivergenceHighlight['type'];
    let description: string;

    if (!allSameMajority) {
      type = 'opposite_positions';
      const labels = cm.cohort_positions.map(p => `Cohort ${p.cohort_label}: ${p.majority_answer}`);
      description = `Cohorts took different majority positions. ${labels.join(', ')}.`;
    } else if (unanimousCohorts.length > 0 && splitCohorts.length > 0) {
      type = 'unanimous_vs_split';
      const uLabels = unanimousCohorts.map(p => p.cohort_label).join(', ');
      const sLabels = splitCohorts.map(p => p.cohort_label).join(', ');
      description = `Cohort ${uLabels} was unanimous while Cohort ${sLabels} was divided.`;
    } else if (confGap >= 15) {
      type = 'confidence_gap';
      const sorted = cm.cohort_positions.sort((a, b) => b.avg_confidence - a.avg_confidence);
      description = `Same majority position but Cohort ${sorted[0].cohort_label} (avg ${sorted[0].avg_confidence}) was much more confident than Cohort ${sorted[sorted.length - 1].cohort_label} (avg ${sorted[sorted.length - 1].avg_confidence}).`;
    } else {
      continue; // Not interesting enough to highlight
    }

    highlights.push({
      market_question: cm.question,
      market_id: cm.market_id,
      type,
      description,
      cohorts: cm.cohort_positions.map(p => ({
        label: p.cohort_label,
        majority: p.majority_answer,
        avg_confidence: p.avg_confidence,
        sample_basis: p.opinions.find(o => o.basis)?.basis ?? null,
      })),
    });
  }

  return highlights;
}

// ── Confidence analysis builder ──────────────────────────────────────────

function buildConfidenceAnalysis(
  cohorts: CohortComparisonRequest['cohorts'],
  allOpinions: Array<{ agent_id: string; confidence: number | null }>,
  agentCohortMap: Map<string, string>,
): ConfidenceAnalysis {
  const perCohort: ConfidenceAnalysis['per_cohort'] = [];

  for (const cohort of cohorts) {
    const agentSet = new Set(cohort.agent_ids);
    const confs = allOpinions
      .filter(o => agentSet.has(o.agent_id) && o.confidence != null)
      .map(o => o.confidence!);

    if (confs.length === 0) {
      perCohort.push({ label: cohort.label, mean: 0, median: 0, std_dev: 0, high_confidence_pct: 0, low_confidence_pct: 0, total_with_confidence: 0 });
      continue;
    }

    const sorted = [...confs].sort((a, b) => a - b);
    const mean = confs.reduce((s, c) => s + c, 0) / confs.length;
    const median = sorted.length % 2 === 0
      ? (sorted[sorted.length / 2 - 1] + sorted[sorted.length / 2]) / 2
      : sorted[Math.floor(sorted.length / 2)];
    const stdDev = Math.sqrt(confs.reduce((s, c) => s + (c - mean) ** 2, 0) / confs.length);
    const highPct = Math.round((confs.filter(c => c >= 80).length / confs.length) * 100);
    const lowPct = Math.round((confs.filter(c => c <= 30).length / confs.length) * 100);

    perCohort.push({
      label: cohort.label,
      mean: Math.round(mean * 10) / 10,
      median: Math.round(median * 10) / 10,
      std_dev: Math.round(stdDev * 10) / 10,
      high_confidence_pct: highPct,
      low_confidence_pct: lowPct,
      total_with_confidence: confs.length,
    });
  }

  // Generate interpretation
  let interpretation = '';
  if (perCohort.length >= 2) {
    const sorted = [...perCohort].sort((a, b) => b.mean - a.mean);
    const gap = sorted[0].mean - sorted[sorted.length - 1].mean;
    if (gap >= 15) {
      interpretation = `Cohort ${sorted[0].label} is notably more confident (mean ${sorted[0].mean}) than Cohort ${sorted[sorted.length - 1].label} (mean ${sorted[sorted.length - 1].mean}). `;
    }
    const highVar = perCohort.filter(c => c.std_dev >= 20);
    const lowVar = perCohort.filter(c => c.std_dev < 15 && c.total_with_confidence > 0);
    if (highVar.length > 0 && lowVar.length > 0) {
      interpretation += `Cohort ${highVar.map(c => c.label).join(', ')} shows more varied confidence, while Cohort ${lowVar.map(c => c.label).join(', ')} is more consistent.`;
    }
    if (!interpretation) {
      interpretation = `Confidence levels are similar across cohorts (gap of ${Math.round(gap)} points).`;
    }
  } else if (perCohort.length === 1) {
    interpretation = `Single cohort with mean confidence of ${perCohort[0].mean}.`;
  }

  return { per_cohort: perCohort, interpretation: interpretation.trim() };
}
