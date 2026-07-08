/**
 * Aggregate results service for /markets/:id/results.
 *
 * Encapsulates Architecture A' privacy guarantees:
 *  - cohort filter (default 'human', overridable via ?cohort and LEGACY_RESULT_COHORT env)
 *  - per-bucket k-anonymity suppression (K from K_ANONYMITY_THRESHOLD, default 5)
 *  - no per-agent identifiers, no free-text basis, no longform answer text
 *
 * Per-agent disclosure lives behind admin auth at GET /admin/api/markets/:id/raw-results.
 */
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { agents, opinions } from '../db/schema.js';
import { safeJsonParse } from '../utils.js';

export type Cohort = 'human' | 'synthetic' | 'all';

export function resolveCohortParam(query: string | undefined): Cohort {
  const legacyDefault: Cohort = process.env.LEGACY_RESULT_COHORT === 'all' ? 'all' : 'human';
  const requested = (query ?? legacyDefault).toLowerCase();
  if (requested === 'human' || requested === 'synthetic' || requested === 'all') {
    return requested;
  }
  return legacyDefault;
}

export function getKAnonymityThreshold(): number {
  const raw = process.env.K_ANONYMITY_THRESHOLD;
  if (!raw) return 5;
  const parsed = parseInt(raw, 10);
  return Number.isFinite(parsed) && parsed >= 1 ? parsed : 5;
}

interface MarketRow {
  id: string;
  question: string;
  answer_type: string | null;
  answer_options: string | null;
  majority_position: string | null;
  funded_amount: number | null;
  platform_fee: number | null;
  reward_pool: number | null;
  reward_distributed: number | null;
}

interface OpinionRow {
  agent_id: string;
  answer: string;
  confidence: number | null;
  review_state: string | null;
}

const SUPPRESSED_BUCKET = '<suppressed>';
const MASKED_COUNT = '<K' as const;

/**
 * Per-bucket k-anonymity for raw counts. Returns the count as-is when 0 or ≥K,
 * and the string '<K' when between 1 and K-1 (the range that would single out
 * a small participant set).
 */
export function maskCount(n: number, k: number): number | typeof MASKED_COUNT {
  if (n === 0) return 0;
  if (n >= k) return n;
  return MASKED_COUNT;
}

/**
 * Compute the K-anon-masked cohort breakdown surfaced on /results.
 *
 *   raw counts ──► maskCount per bucket ──► public breakdown
 *
 * excluded_synthetic encodes whether the requested cohort filter excluded any
 * synthetic agents from aggregation:
 *   - 0 synth in the market    → false  (nothing to exclude)
 *   - synth count below K      → 'masked' (existence + count both hidden)
 *   - synth ≥ K, cohort=human  → true   (count exposed; existence known anyway)
 *   - synth ≥ K, cohort=all    → false  (synth NOT excluded; all cohorts in agg)
 */
export function computeCohortBreakdown(
  humanCount: number,
  syntheticCount: number,
  requested: Cohort,
  k: number,
) {
  let excludedSynthetic: boolean | 'masked';
  if (syntheticCount === 0) {
    excludedSynthetic = false;
  } else if (syntheticCount < k) {
    excludedSynthetic = 'masked';
  } else {
    excludedSynthetic = requested === 'human';
  }
  return {
    human: maskCount(humanCount, k),
    synthetic: maskCount(syntheticCount, k),
    requested,
    excluded_synthetic: excludedSynthetic,
  };
}

/**
 * Build the public, cohort-filtered, K-anon-gated aggregate result for a market.
 * Returns either an InsufficientParticipationResult or a full AggregateResult.
 */
export async function buildAggregateResults(
  market: MarketRow,
  opts: { cohort: Cohort },
): Promise<Record<string, unknown>> {
  const k = getKAnonymityThreshold();
  const rawOpinions = await db
    .select({
      agent_id: opinions.agent_id,
      answer: opinions.answer,
      confidence: opinions.confidence,
      review_state: opinions.review_state,
    })
    .from(opinions)
    .where(eq(opinions.market_id, market.id));

  // Exclude longform answers that are still pending review or were rejected — only
  // approved (or NULL = not subject to review, i.e. typed answers) count toward
  // aggregates. This is what makes the /results endpoint safe to expose: a panelist
  // who slipped soft PII into longform never appears in the aggregate until an
  // admin approves the redacted version.
  const allOpinions = rawOpinions.filter(o =>
    o.review_state === null || o.review_state === 'approved'
  );

  const allAgents = await db
    .select({ id: agents.id, agent_type: agents.agent_type })
    .from(agents);
  const agentTypeById = new Map<string, string | null>(allAgents.map(a => [a.id, a.agent_type]));

  // Cohort tally across the full opinion set (used for the breakdown surface).
  let humanCount = 0;
  let syntheticCount = 0;
  for (const op of allOpinions) {
    const t = agentTypeById.get(op.agent_id);
    if (t === 'human') humanCount++;
    else syntheticCount++;
  }

  const filtered = filterByCohort(allOpinions, agentTypeById, opts.cohort);

  const cohortBreakdown = computeCohortBreakdown(humanCount, syntheticCount, opts.cohort, k);

  // K-anon: if the cohort itself doesn't have at least K participants, return nothing substantive.
  // Do NOT expose participants:N — a polling adversary could watch participation cross K live.
  if (filtered.length < k) {
    return {
      market_id: market.id,
      question: market.question,
      answer_type: market.answer_type ?? 'binary',
      status: 'insufficient_participation',
      participants_below_threshold: true,
      k_anonymity_threshold: k,
      cohort_breakdown: cohortBreakdown,
      message: 'Results withheld pending sufficient participation',
    };
  }

  const answerType = market.answer_type ?? 'binary';

  // Longform: never expose individual answer text from /results, even after approval.
  // PR3 adds the longform review queue; PR1 keeps longform aggregate-only.
  if (answerType === 'longform') {
    return {
      market_id: market.id,
      question: market.question,
      answer_type: 'longform',
      total_participants: filtered.length,
      confidence_metrics: confidenceMetrics(filtered),
      cohort_breakdown: cohortBreakdown,
      funded_amount: market.funded_amount,
      platform_fee: market.platform_fee,
      reward_pool: market.reward_pool,
      reward_distributed: market.reward_distributed,
    };
  }

  const abstentions = filtered.filter(o => o.answer === 'abstain').length;
  const substantive = filtered.filter(o => o.answer !== 'abstain');
  const rawCounts = computeVoteCounts(answerType, market.answer_options, substantive);
  const voteCounts = applyKAnonymity(rawCounts, k);

  return {
    market_id: market.id,
    question: market.question,
    answer_type: answerType,
    majority_position: market.majority_position,
    vote_counts: voteCounts,
    total_participants: filtered.length,
    abstentions,
    substantive_votes: substantive.length,
    confidence_metrics: confidenceMetrics(filtered),
    cohort_breakdown: cohortBreakdown,
    k_anonymity_threshold: k,
    funded_amount: market.funded_amount,
    platform_fee: market.platform_fee,
    reward_pool: market.reward_pool,
    reward_distributed: market.reward_distributed,
  };
}

function filterByCohort(
  opinions: OpinionRow[],
  agentTypeById: Map<string, string | null>,
  cohort: Cohort,
): OpinionRow[] {
  if (cohort === 'all') return opinions;
  return opinions.filter(op => {
    const t = agentTypeById.get(op.agent_id);
    if (cohort === 'human') return t === 'human';
    return t !== 'human';
  });
}

function confidenceMetrics(rows: OpinionRow[]) {
  const values = rows.map(o => o.confidence).filter((v): v is number => v != null);
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  // min/max intentionally omitted: at K-anon threshold (K=5) those are individual
  // data points and would single out outlier panelists.
  return {
    count: values.length,
    avg: Math.round(values.reduce((s, v) => s + v, 0) / values.length),
    median: sorted[Math.floor(sorted.length / 2)],
  };
}

function computeVoteCounts(
  answerType: string,
  rawOptions: string | null,
  substantive: OpinionRow[],
): Record<string, number> {
  if (answerType === 'single_choice') {
    const opts = rawOptions ? safeJsonParse<string[] | null>(rawOptions, null) : null;
    const counts: Record<string, number> = {};
    if (opts) {
      for (const opt of opts) {
        if (opt === 'abstain') continue;
        counts[opt] = substantive.filter(o => o.answer === opt).length;
      }
    }
    return counts;
  }

  if (answerType === 'multi_choice') {
    const opts = rawOptions ? safeJsonParse<string[] | null>(rawOptions, null) : null;
    const counts: Record<string, number> = {};
    if (opts) {
      for (const opt of opts) counts[opt] = 0;
      for (const op of substantive) {
        try {
          const selections = JSON.parse(op.answer) as string[];
          if (Array.isArray(selections)) {
            for (const sel of selections) {
              const matched = opts.find(o => o.toLowerCase() === sel.toLowerCase());
              if (matched) counts[matched]++;
            }
          }
        } catch {
          if (opts.includes(op.answer)) counts[op.answer]++;
        }
      }
    }
    return counts;
  }

  if (answerType === 'ranking') {
    const opts = rawOptions ? safeJsonParse<string[] | null>(rawOptions, null) : null;
    const counts: Record<string, number> = {};
    if (opts) {
      const n = opts.length;
      for (const opt of opts) counts[opt] = 0;
      for (const op of substantive) {
        try {
          const ranking = JSON.parse(op.answer) as string[];
          if (Array.isArray(ranking)) {
            for (let i = 0; i < ranking.length; i++) {
              const matched = opts.find(o => o.toLowerCase() === ranking[i].toLowerCase());
              if (matched) counts[matched] += (n - i);
            }
          }
        } catch { /* skip */ }
      }
    }
    return counts;
  }

  if (answerType === 'scale') {
    const counts: Record<string, number> = {};
    for (const op of substantive) {
      const num = Number(op.answer);
      if (!isNaN(num)) {
        const key = String(num);
        counts[key] = (counts[key] || 0) + 1;
      }
    }
    return counts;
  }

  // binary
  return {
    yes: substantive.filter(o => o.answer === 'yes').length,
    no: substantive.filter(o => o.answer === 'no').length,
  };
}

/**
 * Per-bucket K-anonymity: any bucket with count > 0 but < K is collapsed into a
 * `<suppressed>` aggregate bucket. Buckets at exactly 0 are preserved (they reveal
 * no individual). For ranking markets the values are Borda-count scores rather than
 * raw counts, so suppression is intentionally skipped (a low score doesn't single
 * anyone out).
 */
export function applyKAnonymity(counts: Record<string, number>, k: number): Record<string, number> {
  // Heuristic: ranking buckets often exceed K through aggregation even with few voters,
  // and the unit is "borda points" not "voters". Skip suppression there.
  const looksLikeBordaScores = Object.values(counts).some(v => v > 0 && !Number.isInteger(v));
  if (looksLikeBordaScores) return counts;

  const result: Record<string, number> = {};
  let suppressed = 0;
  for (const [key, count] of Object.entries(counts)) {
    if (count > 0 && count < k) {
      suppressed += count;
    } else {
      result[key] = count;
    }
  }
  if (suppressed > 0) {
    result[SUPPRESSED_BUCKET] = suppressed;
  }
  return result;
}
