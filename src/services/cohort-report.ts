// Cohort report: assembles a publishable analysis of an experimental batch.
//
// Builds on top of generateCohortComparison() (votes, divergence, confidence)
// and adds:
//   - treatment-fingerprint introspection (what actually varied across cohorts)
//   - per-cohort provenance aggregation (context-vs-reasoning grounding)
//   - basis ↔ context Jaccard overlap (lexical signal that the answer reuses context)
//   - chi-square + Mann–Whitney significance per common market
//   - within-cohort outlier detection
//   - an auto-generated headline (researcher overrides at memo-review time)

import { db } from '../db/index.js';
import { agents as agentsTable, opinions as opinionsTable, markets as marketsTable } from '../db/schema.js';
import { like, inArray } from 'drizzle-orm';
import {
  generateCohortComparison,
  marketMatchesFilter,
  type CohortComparisonRequest,
  type CohortComparisonResult,
  type CommonMarketComparison,
  type MarketFilter,
} from './cohort-comparison.js';
import type { KnowledgeSource, ProvenancePayload } from '../types.js';
import { safeJsonParse } from '../utils.js';

// ── Public types ─────────────────────────────────────────────────────────

export interface CohortReportRequest {
  batch_tag: string;             // handle prefix, e.g. "apr"
  cohort_labels: string[];       // e.g. ["A", "B", "C"]
  market_filter?: MarketFilter;
  researcher_intent?: string;    // optional one-liner for memo header
}

export interface ResolvedCohort {
  label: string;
  agent_ids: string[];
  handles: string[];
}

export interface TreatmentFingerprint {
  cohort_label: string;
  distinct_objectives: Array<{ value: string; agent_count: number }>;
  distinct_instructions: Array<{ value_summary: string; agent_count: number }>;
  knowledge_source_dist: Record<string, number>; // count of opinions per ks policy
  unique_traits: string[];                       // human-readable summary bullets
}

export interface ProvenanceAggregate {
  cohort_label: string;
  total_opinions: number;
  opinions_with_provenance: number;
  mean_score: number;             // 0.00 – 1.00 (parsed provenance_score)
  pct_missing_expected: number;   // re-derived from provenance + market.knowledge_source
  pct_misaligned: number;
  mean_basis_overlap: number;     // Jaccard 0–1 between basis tokens and market context
  by_knowledge_source: Array<{
    knowledge_source: string;
    n: number;
    mean_score: number;
    pct_missing_expected: number;
    pct_misaligned: number;
  }>;
}

export interface MarketStatTest {
  market_id: string;
  question: string;
  chi_square: number;
  df: number;
  p_value_approx: 'p<0.01' | 'p<0.05' | 'p<0.1' | 'ns';
  confidence_kruskal_h: number | null;     // multi-cohort generalisation
  confidence_significant: boolean;
  cohort_n: Record<string, number>;
}

export interface AgentOutlier {
  agent_id: string;
  handle: string;
  cohort_label: string;
  participations_in_common_markets: number;
  disagreements_with_own_cohort: number;
  deviation_pct: number;
  example_market_question: string | null;
  example_disagreement: string | null;
}

// Markets where ≥ 1 active cohort answered and ≥ 1 active cohort did not.
// Surfaces "Cohort X refrained while A and B participated" patterns in the memo.
export interface ParticipationGap {
  market_id: string;
  question: string;
  category: string;
  status: string;
  answered_by: string[];   // cohort labels that produced opinions on this market
  refrained: string[];     // active cohort labels with zero opinions on this market
}

// Per-cohort summary across the totality of shared markets — how each cohort
// behaved overall, not just on the divergent ones.
export interface CohortVoice {
  cohort_label: string;
  dominant_style: string;          // most common opinion_style across agents
  mean_confidence: number;         // mean opinion confidence
  primary_domain: string | null;   // most common primary_domain across agents
  consensus_rate: number;          // % of common markets where this cohort's
                                   //   majority matched the cross-cohort overall majority
  common_markets_participated: number;
  mean_provenance: number;         // mirror of ProvenanceAggregate.mean_score for convenience
  mean_basis_overlap: number;      // mirror
  grounding_tag: 'anchored' | 'moderate' | 'drifting' | 'unknown';
}

export interface CohortReport {
  meta: {
    batch_tag: string;
    cohort_labels: string[];
    generated_at: string;
    handle_pattern: string;
    researcher_intent: string | null;
  };
  resolved_cohorts: ResolvedCohort[];
  comparison: CohortComparisonResult;
  treatment_fingerprints: TreatmentFingerprint[];
  provenance_aggregates: ProvenanceAggregate[];
  market_stat_tests: MarketStatTest[];
  outliers: AgentOutlier[];
  participation_gaps: ParticipationGap[];
  cohort_voices: CohortVoice[];
  headline: {
    one_liner: string;
    bullets: string[];
  };
}

// ── Helpers: stats ───────────────────────────────────────────────────────

const CHI2_CRIT: Record<number, [number, number, number]> = {
  1: [6.635, 3.841, 2.706],
  2: [9.210, 5.991, 4.605],
  3: [11.345, 7.815, 6.251],
  4: [13.277, 9.488, 7.779],
  5: [15.086, 11.070, 9.236],
  6: [16.812, 12.592, 10.645],
  7: [18.475, 14.067, 12.017],
  8: [20.090, 15.507, 13.362],
};

function chiSquareApproxP(chi2: number, df: number): MarketStatTest['p_value_approx'] {
  if (df <= 0 || !CHI2_CRIT[df]) return 'ns';
  const [c01, c05, c10] = CHI2_CRIT[df];
  if (chi2 >= c01) return 'p<0.01';
  if (chi2 >= c05) return 'p<0.05';
  if (chi2 >= c10) return 'p<0.1';
  return 'ns';
}

function chiSquare(matrix: number[][]): { chi2: number; df: number } {
  if (matrix.length < 2 || matrix[0].length < 2) return { chi2: 0, df: 0 };
  const rowTotals = matrix.map(r => r.reduce((a, b) => a + b, 0));
  const colTotals = matrix[0].map((_, j) => matrix.reduce((s, r) => s + r[j], 0));
  const grand = rowTotals.reduce((a, b) => a + b, 0);
  if (grand === 0) return { chi2: 0, df: 0 };
  let chi2 = 0;
  for (let i = 0; i < matrix.length; i++) {
    for (let j = 0; j < matrix[0].length; j++) {
      const expected = (rowTotals[i] * colTotals[j]) / grand;
      if (expected > 0) chi2 += (matrix[i][j] - expected) ** 2 / expected;
    }
  }
  const df = (matrix.length - 1) * (matrix[0].length - 1);
  return { chi2: Math.round(chi2 * 100) / 100, df };
}

// Kruskal–Wallis H for k ≥ 2 groups of confidence scores
function kruskalWallisH(groups: number[][]): { h: number; significant: boolean } | null {
  const nonEmpty = groups.filter(g => g.length > 0);
  if (nonEmpty.length < 2) return null;
  const all: Array<{ v: number; group: number }> = [];
  nonEmpty.forEach((g, idx) => g.forEach(v => all.push({ v, group: idx })));
  if (all.length < 4) return null;
  all.sort((a, b) => a.v - b.v);

  // Average ranks for ties
  const ranks = new Array<number>(all.length);
  let i = 0;
  while (i < all.length) {
    let j = i;
    while (j < all.length && all[j].v === all[i].v) j++;
    const avg = (i + 1 + j) / 2;
    for (let k = i; k < j; k++) ranks[k] = avg;
    i = j;
  }

  const rankSum: number[] = nonEmpty.map(() => 0);
  for (let k = 0; k < all.length; k++) rankSum[all[k].group] += ranks[k];
  const N = all.length;
  let h = 0;
  nonEmpty.forEach((g, idx) => { h += (rankSum[idx] ** 2) / g.length; });
  h = (12 / (N * (N + 1))) * h - 3 * (N + 1);

  // Chi-square approx with df = k-1; significant at p<0.05
  const df = nonEmpty.length - 1;
  const crit05 = CHI2_CRIT[df]?.[1] ?? Infinity;
  return { h: Math.round(h * 100) / 100, significant: h >= crit05 };
}

// ── Helpers: text ────────────────────────────────────────────────────────

const STOPWORDS = new Set([
  'this', 'that', 'with', 'from', 'have', 'will', 'their', 'they', 'them',
  'about', 'would', 'could', 'should', 'because', 'which', 'where', 'when',
  'what', 'into', 'than', 'then', 'these', 'those', 'some', 'such', 'also',
  'been', 'were', 'more', 'most', 'much', 'many', 'over', 'under', 'while',
]);

function tokenize(text: string | null | undefined): Set<string> {
  if (!text) return new Set();
  const tokens = text
    .toLowerCase()
    .replace(/[^\w\s]/g, ' ')
    .split(/\s+/)
    .filter(t => t.length > 3 && !STOPWORDS.has(t) && !/^\d+$/.test(t));
  return new Set(tokens);
}

function jaccard(a: Set<string>, b: Set<string>): number {
  if (a.size === 0 || b.size === 0) return 0;
  let intersect = 0;
  for (const t of a) if (b.has(t)) intersect++;
  const union = a.size + b.size - intersect;
  return union > 0 ? Math.round((intersect / union) * 1000) / 1000 : 0;
}

function summariseInstructions(value: string | null): string {
  if (!value) return '(none)';
  const trimmed = value.trim().replace(/\s+/g, ' ');
  return trimmed.length > 80 ? trimmed.slice(0, 77) + '…' : trimmed;
}

// Re-derive provenance flags from raw payload (so we can re-score even if
// opinions row predates the provenance_score column being populated).
const CONTEXT_TYPES = new Set(['article', 'data_point', 'link', 'attachment', 'agent_kb']);

function classifyProvenance(
  payload: ProvenancePayload,
  ks: KnowledgeSource,
): { hasContext: boolean; hasLocal: boolean; hasTraining: boolean; missingExpected: boolean; misaligned: boolean } {
  const types = (payload.sources || []).map(s => s.type);
  const hasContext = types.some(t => CONTEXT_TYPES.has(t));
  const hasLocal = types.includes('local');
  const hasTraining = types.includes('training');
  let missingExpected = false;
  let misaligned = false;
  if (ks === 'provided_context_only') {
    if (!hasContext) missingExpected = true;
    if (hasLocal || hasTraining) misaligned = true;
  } else if (ks === 'local_only') {
    if (!hasLocal) missingExpected = true;
    if (hasContext || hasTraining) misaligned = true;
  } else if (ks === 'training_knowledge') {
    if (!hasTraining) missingExpected = true;
    if (hasLocal || hasContext) misaligned = true;
  }
  return { hasContext, hasLocal, hasTraining, missingExpected, misaligned };
}

// ── Batch discovery ──────────────────────────────────────────────────────

export interface DiscoveredBatch {
  batch_tag: string;
  total_agents: number;
  labels: Array<{ label: string; agent_count: number }>;
  sample_handles: string[];
}

// Scan all agent handles and group ones matching `{batch}-{LABEL}{digits}` by
// detected batch tag, returning each batch's distinct labels and counts.
// Sorted by total_agents desc so the biggest experiments float to the top.
export async function listBatches(): Promise<DiscoveredBatch[]> {
  const rows = await db.select({ handle: agentsTable.handle }).from(agentsTable);
  // Match `{batch}-{LABEL}{digits}` where batch is lowercase letters/digits/_/-
  // (not containing another dash before the label) and LABEL is 1+ letters.
  // Use lazy match on batch to ensure we capture the *last* dash-letter-number
  // group as the cohort.
  const pattern = /^([a-z0-9][a-z0-9_]*)-([A-Za-z]+)(\d+)$/;
  const batches = new Map<string, Map<string, { count: number; samples: string[] }>>();
  for (const row of rows) {
    const m = row.handle.match(pattern);
    if (!m) continue;
    const batchTag = m[1];
    const label = m[2].toUpperCase();
    if (!batches.has(batchTag)) batches.set(batchTag, new Map());
    const byLabel = batches.get(batchTag)!;
    if (!byLabel.has(label)) byLabel.set(label, { count: 0, samples: [] });
    const entry = byLabel.get(label)!;
    entry.count += 1;
    if (entry.samples.length < 2) entry.samples.push(row.handle);
  }

  const out: DiscoveredBatch[] = [];
  for (const [batchTag, byLabel] of batches) {
    // Only surface batches with ≥ 2 distinct cohort labels — single-label
    // batches aren't comparison-ready.
    if (byLabel.size < 2) continue;
    const labels = Array.from(byLabel.entries())
      .map(([label, v]) => ({ label, agent_count: v.count }))
      .sort((a, b) => a.label.localeCompare(b.label));
    const sample_handles: string[] = [];
    for (const [, v] of byLabel) for (const h of v.samples) if (sample_handles.length < 3) sample_handles.push(h);
    const total_agents = labels.reduce((s, l) => s + l.agent_count, 0);
    out.push({ batch_tag: batchTag, total_agents, labels, sample_handles });
  }
  out.sort((a, b) => b.total_agents - a.total_agents);
  return out;
}

// ── Cohort resolution ────────────────────────────────────────────────────

export async function resolveCohorts(
  batchTag: string,
  cohortLabels: string[],
): Promise<ResolvedCohort[]> {
  // Match handles like `{batch}-{LABEL}<digits>` — case-insensitive on the label
  const rows = await db
    .select({ id: agentsTable.id, handle: agentsTable.handle })
    .from(agentsTable)
    .where(like(agentsTable.handle, `${batchTag}-%`));

  const byLabel = new Map<string, ResolvedCohort>();
  for (const label of cohortLabels) {
    byLabel.set(label, { label, agent_ids: [], handles: [] });
  }

  // Build a regex per label to be strict
  const labelRegexes = new Map<string, RegExp>();
  for (const label of cohortLabels) {
    const safe = label.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
    labelRegexes.set(label, new RegExp(`^${batchTag}-${safe}\\d+$`, 'i'));
  }

  for (const row of rows) {
    for (const [label, re] of labelRegexes) {
      if (re.test(row.handle)) {
        const c = byLabel.get(label)!;
        c.agent_ids.push(row.id);
        c.handles.push(row.handle);
        break;
      }
    }
  }
  return Array.from(byLabel.values());
}

// ── Main report builder ──────────────────────────────────────────────────

export async function generateCohortReport(req: CohortReportRequest): Promise<CohortReport> {
  const resolved = await resolveCohorts(req.batch_tag, req.cohort_labels);
  const handlePattern = `^${req.batch_tag}-{LABEL}\\d+$`;

  // Empty-batch short-circuit
  const allAgentIds = resolved.flatMap(c => c.agent_ids);
  if (allAgentIds.length === 0) {
    return emptyReport(req.batch_tag, req.cohort_labels, resolved, handlePattern, req.researcher_intent, 'No agents matched the batch/label pattern.');
  }

  const cohortsWithAgents = resolved.filter(c => c.agent_ids.length > 0);
  if (cohortsWithAgents.length < 2) {
    return emptyReport(req.batch_tag, req.cohort_labels, resolved, handlePattern, req.researcher_intent, 'Fewer than 2 cohorts had any agents.');
  }

  return buildReportFromResolved({
    batchTag: req.batch_tag,
    cohortLabels: req.cohort_labels,
    handlePattern,
    resolved,
    cohortsWithAgents,
    marketFilter: req.market_filter,
    researcherIntent: req.researcher_intent,
  });
}

// Variant: explicit cohorts (manual agent selection in Cohort Analyzer UI). No
// batch_tag, no handle pattern — the caller already knows which agents belong
// to which cohort.
export async function generateCohortReportFromExplicitCohorts(req: {
  cohorts: Array<{ label: string; agent_ids: string[] }>;
  researcher_intent?: string;
  market_filter?: MarketFilter;
}): Promise<CohortReport> {
  const allAgentIds = req.cohorts.flatMap(c => c.agent_ids);
  if (allAgentIds.length === 0) {
    return emptyReport('(ad-hoc)', req.cohorts.map(c => c.label), [], '(manual selection)', req.researcher_intent, 'No agents in any cohort.');
  }
  // Hydrate handles for each cohort
  const agentRows = await db.select({ id: agentsTable.id, handle: agentsTable.handle }).from(agentsTable).where(inArray(agentsTable.id, allAgentIds));
  const handleById = new Map(agentRows.map(a => [a.id, a.handle]));
  const resolved: ResolvedCohort[] = req.cohorts.map(c => ({
    label: c.label,
    agent_ids: c.agent_ids,
    handles: c.agent_ids.map(id => handleById.get(id) ?? id),
  }));
  const cohortsWithAgents = resolved.filter(c => c.agent_ids.length > 0);
  if (cohortsWithAgents.length < 2) {
    return emptyReport('(ad-hoc)', req.cohorts.map(c => c.label), resolved, '(manual selection)', req.researcher_intent, 'Fewer than 2 cohorts had any agents.');
  }
  return buildReportFromResolved({
    batchTag: '(ad-hoc)',
    cohortLabels: req.cohorts.map(c => c.label),
    handlePattern: '(manual selection)',
    resolved,
    cohortsWithAgents,
    marketFilter: req.market_filter,
    researcherIntent: req.researcher_intent,
  });
}

// Shared core. Both public entry points feed this once they've decided how to
// resolve the cohort → agent mapping.
async function buildReportFromResolved(args: {
  batchTag: string;
  cohortLabels: string[];
  handlePattern: string;
  resolved: ResolvedCohort[];
  cohortsWithAgents: ResolvedCohort[];
  marketFilter?: MarketFilter;
  researcherIntent?: string;
}): Promise<CohortReport> {
  const { batchTag, cohortLabels, handlePattern, resolved, cohortsWithAgents, marketFilter, researcherIntent } = args;
  const allAgentIds = cohortsWithAgents.flatMap(c => c.agent_ids);

  const compareRequest: CohortComparisonRequest = {
    cohorts: cohortsWithAgents.map(c => ({ label: c.label, agent_ids: c.agent_ids })),
    market_filter: marketFilter,
  };
  const comparison = await generateCohortComparison(compareRequest);

  const [agentRows, opinionRows, marketRows] = await Promise.all([
    db.select().from(agentsTable).where(inArray(agentsTable.id, allAgentIds)),
    db.select().from(opinionsTable).where(inArray(opinionsTable.agent_id, allAgentIds)),
    db.select().from(marketsTable),
  ]);
  const agentMap = new Map(agentRows.map(a => [a.id, a]));
  const marketMap = new Map(marketRows.map(m => [m.id, m]));
  const agentCohort = new Map<string, string>();
  for (const c of cohortsWithAgents) for (const id of c.agent_ids) agentCohort.set(id, c.label);

  const treatmentFingerprints = buildTreatmentFingerprints(cohortsWithAgents, agentMap, opinionRows, marketMap);
  const provenanceAggregates = buildProvenanceAggregates(cohortsWithAgents, opinionRows, marketMap);
  const marketStatTests: MarketStatTest[] = comparison.common_markets.map(cm => runStatTests(cm, opinionRows, agentCohort));
  const outliers = findOutliers(comparison.common_markets, agentMap, agentCohort);
  const participationGaps = buildParticipationGaps(cohortsWithAgents, opinionRows, marketMap, agentCohort, marketFilter);
  const cohortVoices = buildCohortVoices(comparison, provenanceAggregates);
  const headline = buildHeadline(comparison, provenanceAggregates, marketStatTests);

  return {
    meta: {
      batch_tag: batchTag,
      cohort_labels: cohortLabels,
      generated_at: new Date().toISOString(),
      handle_pattern: handlePattern,
      researcher_intent: researcherIntent ?? null,
    },
    resolved_cohorts: resolved,
    comparison,
    treatment_fingerprints: treatmentFingerprints,
    provenance_aggregates: provenanceAggregates,
    market_stat_tests: marketStatTests,
    outliers,
    participation_gaps: participationGaps,
    cohort_voices: cohortVoices,
    headline,
  };
}

function emptyReport(
  batchTag: string,
  cohortLabels: string[],
  resolved: ResolvedCohort[],
  handlePattern: string,
  researcherIntent: string | undefined,
  reason: string,
): CohortReport {
  return {
    meta: {
      batch_tag: batchTag,
      cohort_labels: cohortLabels,
      generated_at: new Date().toISOString(),
      handle_pattern: handlePattern,
      researcher_intent: researcherIntent ?? null,
    },
    resolved_cohorts: resolved,
    comparison: { cohorts: [], common_markets: [], divergence_highlights: [], confidence_analysis: { per_cohort: [], interpretation: reason } },
    treatment_fingerprints: [],
    provenance_aggregates: [],
    market_stat_tests: [],
    outliers: [],
    participation_gaps: [],
    cohort_voices: [],
    headline: { one_liner: reason, bullets: [] },
  };
}

// ── Treatment fingerprint ────────────────────────────────────────────────

function buildTreatmentFingerprints(
  cohorts: ResolvedCohort[],
  agentMap: Map<string, typeof agentsTable.$inferSelect>,
  opinionRows: Array<typeof opinionsTable.$inferSelect>,
  marketMap: Map<string, typeof marketsTable.$inferSelect>,
): TreatmentFingerprint[] {
  // First pass: per-cohort distinct objective / instruction / ks distribution
  const cohortObjectives = new Map<string, Set<string>>();
  const out: TreatmentFingerprint[] = [];
  for (const cohort of cohorts) {
    const objBuckets = new Map<string, number>();
    const insBuckets = new Map<string, number>();
    for (const id of cohort.agent_ids) {
      const a = agentMap.get(id);
      const objKey = a?.custom_objective?.trim() || '(none)';
      const insKey = summariseInstructions(a?.custom_instructions ?? null);
      objBuckets.set(objKey, (objBuckets.get(objKey) || 0) + 1);
      insBuckets.set(insKey, (insBuckets.get(insKey) || 0) + 1);
    }

    const ksDist: Record<string, number> = {};
    for (const op of opinionRows) {
      if (!cohort.agent_ids.includes(op.agent_id)) continue;
      const m = marketMap.get(op.market_id);
      if (!m) continue;
      ksDist[m.knowledge_source] = (ksDist[m.knowledge_source] || 0) + 1;
    }

    cohortObjectives.set(cohort.label, new Set(objBuckets.keys()));

    out.push({
      cohort_label: cohort.label,
      distinct_objectives: Array.from(objBuckets, ([value, agent_count]) => ({ value, agent_count }))
        .sort((a, b) => b.agent_count - a.agent_count),
      distinct_instructions: Array.from(insBuckets, ([value_summary, agent_count]) => ({ value_summary, agent_count }))
        .sort((a, b) => b.agent_count - a.agent_count),
      knowledge_source_dist: ksDist,
      unique_traits: [],
    });
  }

  // Second pass: detect "unique traits" — objectives present in only one cohort
  for (const tf of out) {
    const mine = cohortObjectives.get(tf.cohort_label)!;
    for (const obj of mine) {
      if (obj === '(none)') continue;
      const heldByOthers = Array.from(cohortObjectives.entries()).some(
        ([label, set]) => label !== tf.cohort_label && set.has(obj),
      );
      if (!heldByOthers) {
        const short = obj.length > 60 ? obj.slice(0, 57) + '…' : obj;
        tf.unique_traits.push(`Unique objective: "${short}"`);
      }
    }
    // Detect dominant knowledge-source bias
    const total = Object.values(tf.knowledge_source_dist).reduce((s, n) => s + n, 0);
    if (total > 0) {
      const sorted = Object.entries(tf.knowledge_source_dist).sort((a, b) => b[1] - a[1]);
      const [topKs, topN] = sorted[0];
      const share = Math.round((topN / total) * 100);
      if (share >= 80) {
        tf.unique_traits.push(`${share}% of opinions came from markets with knowledge_source="${topKs}"`);
      }
    }
  }

  return out;
}

// ── Provenance aggregates ────────────────────────────────────────────────

function buildProvenanceAggregates(
  cohorts: ResolvedCohort[],
  opinionRows: Array<typeof opinionsTable.$inferSelect>,
  marketMap: Map<string, typeof marketsTable.$inferSelect>,
): ProvenanceAggregate[] {
  return cohorts.map(cohort => {
    const idSet = new Set(cohort.agent_ids);
    const cohortOpinions = opinionRows.filter(o => idSet.has(o.agent_id));

    let withProv = 0;
    let scoreSum = 0;
    let missing = 0;
    let misaligned = 0;
    let overlapSum = 0;
    let overlapCount = 0;
    const byKs = new Map<string, { n: number; scoreSum: number; missing: number; misaligned: number }>();

    for (const op of cohortOpinions) {
      const market = marketMap.get(op.market_id);
      const ks = (market?.knowledge_source ?? 'any') as KnowledgeSource;
      const payload = safeJsonParse<ProvenancePayload>(op.provenance_json ?? '', { sources: [] });
      const hasAnySource = payload.sources && payload.sources.length > 0;

      if (hasAnySource) {
        withProv++;
        // Prefer stored score; fall back to recomputed
        let score = op.provenance_score;
        if (score == null) {
          // Recompute approximate score: 1.0 minus penalties
          const flags = classifyProvenance(payload, ks);
          score = 1.0;
          if (flags.missingExpected) score -= 0.3;
          if (flags.misaligned) score -= 0.3;
          if (score < 0) score = 0;
        }
        scoreSum += score;
        const flags = classifyProvenance(payload, ks);
        if (flags.missingExpected) missing++;
        if (flags.misaligned) misaligned++;

        if (!byKs.has(ks)) byKs.set(ks, { n: 0, scoreSum: 0, missing: 0, misaligned: 0 });
        const slot = byKs.get(ks)!;
        slot.n++;
        slot.scoreSum += score;
        if (flags.missingExpected) slot.missing++;
        if (flags.misaligned) slot.misaligned++;
      }

      // Basis ↔ context overlap (regardless of provenance)
      if (op.basis && market) {
        const ctxBlob = `${market.description ?? ''} ${market.context_json ?? ''}`;
        const overlap = jaccard(tokenize(op.basis), tokenize(ctxBlob));
        overlapSum += overlap;
        overlapCount++;
      }
    }

    return {
      cohort_label: cohort.label,
      total_opinions: cohortOpinions.length,
      opinions_with_provenance: withProv,
      mean_score: withProv > 0 ? Math.round((scoreSum / withProv) * 100) / 100 : 0,
      pct_missing_expected: withProv > 0 ? Math.round((missing / withProv) * 100) : 0,
      pct_misaligned: withProv > 0 ? Math.round((misaligned / withProv) * 100) : 0,
      mean_basis_overlap: overlapCount > 0 ? Math.round((overlapSum / overlapCount) * 1000) / 1000 : 0,
      by_knowledge_source: Array.from(byKs, ([knowledge_source, agg]) => ({
        knowledge_source,
        n: agg.n,
        mean_score: agg.n > 0 ? Math.round((agg.scoreSum / agg.n) * 100) / 100 : 0,
        pct_missing_expected: agg.n > 0 ? Math.round((agg.missing / agg.n) * 100) : 0,
        pct_misaligned: agg.n > 0 ? Math.round((agg.misaligned / agg.n) * 100) : 0,
      })).sort((a, b) => b.n - a.n),
    };
  });
}

// ── Per-market stat tests ────────────────────────────────────────────────

function runStatTests(
  cm: CommonMarketComparison,
  opinionRows: Array<typeof opinionsTable.$inferSelect>,
  agentCohort: Map<string, string>,
): MarketStatTest {
  // Build contingency matrix: rows=cohorts, cols=answers
  const allAnswers = new Set<string>();
  for (const pos of cm.cohort_positions) {
    for (const ans of Object.keys(pos.answer_distribution)) allAnswers.add(ans);
  }
  const answerList = Array.from(allAnswers);
  const matrix: number[][] = cm.cohort_positions.map(pos =>
    answerList.map(ans => pos.answer_distribution[ans] || 0),
  );
  const { chi2, df } = chiSquare(matrix);

  // Confidence groups per cohort, from raw opinions
  const cohortConfidence = new Map<string, number[]>();
  for (const op of opinionRows) {
    if (op.market_id !== cm.market_id) continue;
    const label = agentCohort.get(op.agent_id);
    if (!label) continue;
    if (op.confidence == null) continue;
    if (!cohortConfidence.has(label)) cohortConfidence.set(label, []);
    cohortConfidence.get(label)!.push(op.confidence);
  }
  const kw = kruskalWallisH(Array.from(cohortConfidence.values()));
  const cohortN: Record<string, number> = {};
  for (const pos of cm.cohort_positions) {
    cohortN[pos.cohort_label] = pos.opinions.length;
  }

  return {
    market_id: cm.market_id,
    question: cm.question,
    chi_square: chi2,
    df,
    p_value_approx: chiSquareApproxP(chi2, df),
    confidence_kruskal_h: kw ? kw.h : null,
    confidence_significant: kw ? kw.significant : false,
    cohort_n: cohortN,
  };
}

// ── Outliers ─────────────────────────────────────────────────────────────

function findOutliers(
  commonMarkets: CommonMarketComparison[],
  agentMap: Map<string, typeof agentsTable.$inferSelect>,
  agentCohort: Map<string, string>,
): AgentOutlier[] {
  // For each agent: count participations in common markets + disagreements w/ own cohort majority
  const stats = new Map<string, {
    participations: number;
    disagreements: number;
    cohort: string;
    handle: string;
    exampleMarket: string | null;
    exampleAnswer: string | null;
  }>();

  for (const cm of commonMarkets) {
    // map cohort_label → majority_answer
    const majByCohort = new Map<string, string>();
    for (const pos of cm.cohort_positions) majByCohort.set(pos.cohort_label, pos.majority_answer);

    for (const pos of cm.cohort_positions) {
      for (const op of pos.opinions) {
        // Find agent_id by handle (could keep a reverse map but small N)
        const agentEntry = Array.from(agentMap.values()).find(a => a.handle === op.agent_handle);
        if (!agentEntry) continue;
        const cohortLabel = agentCohort.get(agentEntry.id);
        if (!cohortLabel) continue;
        const ownMajority = majByCohort.get(cohortLabel);
        if (!ownMajority) continue;
        const slot = stats.get(agentEntry.id) ?? {
          participations: 0,
          disagreements: 0,
          cohort: cohortLabel,
          handle: agentEntry.handle,
          exampleMarket: null,
          exampleAnswer: null,
        };
        slot.participations++;
        if (op.answer !== ownMajority) {
          slot.disagreements++;
          if (!slot.exampleMarket) {
            slot.exampleMarket = cm.question;
            slot.exampleAnswer = `answered "${op.answer}" while own cohort majority was "${ownMajority}"`;
          }
        }
        stats.set(agentEntry.id, slot);
      }
    }
  }

  const outliers: AgentOutlier[] = Array.from(stats, ([agent_id, s]) => ({
    agent_id,
    handle: s.handle,
    cohort_label: s.cohort,
    participations_in_common_markets: s.participations,
    disagreements_with_own_cohort: s.disagreements,
    deviation_pct: s.participations > 0 ? Math.round((s.disagreements / s.participations) * 100) : 0,
    example_market_question: s.exampleMarket,
    example_disagreement: s.exampleAnswer,
  }))
    .filter(o => o.participations_in_common_markets >= 3)
    .sort((a, b) => b.deviation_pct - a.deviation_pct);

  return outliers;
}

// ── Participation gaps ───────────────────────────────────────────────────
// Markets where ≥ 1 cohort answered and ≥ 1 active cohort did not.
// Includes single-cohort markets (which never appear in comparison.common_markets
// because that requires ≥ 2 participating cohorts).

function buildParticipationGaps(
  cohorts: ResolvedCohort[],
  opinionRows: Array<typeof opinionsTable.$inferSelect>,
  marketMap: Map<string, typeof marketsTable.$inferSelect>,
  agentCohort: Map<string, string>,
  marketFilter?: MarketFilter,
): ParticipationGap[] {
  const activeLabels = cohorts.map(c => c.label);
  const opinionsByMarket = new Map<string, Set<string>>();

  for (const op of opinionRows) {
    const label = agentCohort.get(op.agent_id);
    if (!label) continue;
    if (!opinionsByMarket.has(op.market_id)) opinionsByMarket.set(op.market_id, new Set());
    opinionsByMarket.get(op.market_id)!.add(label);
  }

  const gaps: ParticipationGap[] = [];
  for (const [marketId, labelsSeen] of opinionsByMarket) {
    if (labelsSeen.size >= activeLabels.length) continue;
    const market = marketMap.get(marketId);
    if (!market) continue;
    if (!marketMatchesFilter(market, marketFilter)) continue;

    const answered_by = activeLabels.filter(l => labelsSeen.has(l));
    const refrained = activeLabels.filter(l => !labelsSeen.has(l));
    if (refrained.length === 0 || answered_by.length === 0) continue;

    gaps.push({
      market_id: marketId,
      question: market.question,
      category: market.category,
      status: market.status,
      answered_by,
      refrained,
    });
  }

  // Sort by how many cohorts refrained (more = more notable), then alphabetical
  gaps.sort((a, b) => b.refrained.length - a.refrained.length || a.question.localeCompare(b.question));
  return gaps;
}

// ── Cohort voices ────────────────────────────────────────────────────────
// Per-cohort summary across the totality of shared (common) markets.

function buildCohortVoices(
  comparison: CohortComparisonResult,
  provenance: ProvenanceAggregate[],
): CohortVoice[] {
  const provByLabel = new Map(provenance.map(p => [p.cohort_label, p]));
  const confByLabel = new Map(comparison.confidence_analysis.per_cohort.map(c => [c.label, c]));

  // For each common market, compute the overall majority answer (across all
  // opinions from all participating cohorts), then count per-cohort alignment.
  const participations = new Map<string, number>();
  const aligned = new Map<string, number>();

  for (const cm of comparison.common_markets) {
    const tally: Record<string, number> = {};
    for (const pos of cm.cohort_positions) {
      for (const [ans, n] of Object.entries(pos.answer_distribution)) {
        tally[ans] = (tally[ans] || 0) + n;
      }
    }
    const overall = Object.entries(tally).sort((a, b) => b[1] - a[1])[0]?.[0];
    if (!overall) continue;

    for (const pos of cm.cohort_positions) {
      participations.set(pos.cohort_label, (participations.get(pos.cohort_label) || 0) + 1);
      if (pos.majority_answer === overall) {
        aligned.set(pos.cohort_label, (aligned.get(pos.cohort_label) || 0) + 1);
      }
    }
  }

  return comparison.cohorts.map(cs => {
    const styleEntries = Object.entries(cs.aggregate.style_distribution).sort((a, b) => b[1] - a[1]);
    const dominantStyle = styleEntries[0]?.[0] ?? 'unknown';

    const domainTally: Record<string, number> = {};
    for (const a of cs.agents) {
      if (a.primary_domain) domainTally[a.primary_domain] = (domainTally[a.primary_domain] || 0) + 1;
    }
    const primaryDomain = Object.entries(domainTally).sort((a, b) => b[1] - a[1])[0]?.[0] ?? null;

    const parts = participations.get(cs.label) ?? 0;
    const alignedN = aligned.get(cs.label) ?? 0;
    const consensusRate = parts > 0 ? Math.round((alignedN / parts) * 100) : 0;

    const prov = provByLabel.get(cs.label);
    const meanProv = prov?.mean_score ?? 0;
    const meanOverlap = prov?.mean_basis_overlap ?? 0;
    const groundingTag: CohortVoice['grounding_tag'] =
      prov == null || prov.opinions_with_provenance === 0
        ? 'unknown'
        : meanProv >= 0.85
          ? 'anchored'
          : meanProv >= 0.6
            ? 'moderate'
            : 'drifting';

    const conf = confByLabel.get(cs.label);
    const meanConfidence = conf?.mean ?? cs.aggregate.avg_confidence;

    return {
      cohort_label: cs.label,
      dominant_style: dominantStyle,
      mean_confidence: meanConfidence,
      primary_domain: primaryDomain,
      consensus_rate: consensusRate,
      common_markets_participated: parts,
      mean_provenance: meanProv,
      mean_basis_overlap: meanOverlap,
      grounding_tag: groundingTag,
    };
  });
}

// ── Headline ─────────────────────────────────────────────────────────────

function buildHeadline(
  comparison: CohortComparisonResult,
  provenance: ProvenanceAggregate[],
  stats: MarketStatTest[],
): { one_liner: string; bullets: string[] } {
  const bullets: string[] = [];

  // 1) Vote divergence
  const significantMarkets = stats.filter(s => s.p_value_approx !== 'ns');
  if (significantMarkets.length > 0) {
    bullets.push(
      `${significantMarkets.length} of ${stats.length} common markets showed statistically significant answer-distribution differences across cohorts (χ² test, p<0.1 or stricter).`,
    );
  } else if (stats.length > 0) {
    bullets.push(`No common markets showed statistically significant answer-distribution differences across cohorts under χ² (n=${stats.length}).`);
  }

  // 2) Provenance gap
  if (provenance.length >= 2) {
    const sorted = [...provenance].sort((a, b) => b.mean_score - a.mean_score);
    const top = sorted[0];
    const bottom = sorted[sorted.length - 1];
    const gap = top.mean_score - bottom.mean_score;
    if (gap >= 0.1) {
      bullets.push(
        `Cohort ${top.cohort_label} grounded answers in context more cleanly (mean provenance ${top.mean_score.toFixed(2)}) than Cohort ${bottom.cohort_label} (${bottom.mean_score.toFixed(2)}, gap ${gap.toFixed(2)}).`,
      );
    }
    // basis overlap
    const overlapSorted = [...provenance].sort((a, b) => b.mean_basis_overlap - a.mean_basis_overlap);
    const oTop = overlapSorted[0];
    const oBot = overlapSorted[overlapSorted.length - 1];
    if (oTop.mean_basis_overlap - oBot.mean_basis_overlap >= 0.05) {
      bullets.push(
        `Cohort ${oTop.cohort_label}'s rationales reused provided context most (Jaccard ${oTop.mean_basis_overlap.toFixed(2)}); Cohort ${oBot.cohort_label}'s read more inferential (${oBot.mean_basis_overlap.toFixed(2)}).`,
      );
    }
  }

  // 3) Confidence gap
  const confSorted = [...comparison.confidence_analysis.per_cohort].sort((a, b) => b.mean - a.mean);
  if (confSorted.length >= 2) {
    const gap = confSorted[0].mean - confSorted[confSorted.length - 1].mean;
    if (gap >= 15) {
      bullets.push(
        `Cohort ${confSorted[0].label} was ${gap.toFixed(0)} points more confident on average than Cohort ${confSorted[confSorted.length - 1].label}.`,
      );
    }
  }

  // One-liner: the most striking bullet, restated
  let oneLiner = bullets[0] ?? 'No notable cross-cohort differences detected — treatments may be too similar or sample too small.';
  if (bullets.length === 0 && comparison.cohorts.length > 0) {
    oneLiner = 'No notable cross-cohort differences detected — sample may be too small or cohorts too similar.';
  }

  return { one_liner: oneLiner, bullets };
}
