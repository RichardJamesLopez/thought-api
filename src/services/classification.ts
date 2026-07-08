import { db } from '../db/index.js';
import { agents, opinions, markets, profileAnswers, agentClassifications, classificationThresholds } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';
import logger from '../logger.js';
import { computePluralityExcluding } from './resolution.js';
import { requiredGenesisKeys } from '../db/profile-questions.js';

// Category → domain tag mapping
const CATEGORY_DOMAIN_MAP: Record<string, string> = {
  technology_innovation: 'tech',
  fashion_trends: 'fashion',
  politics_governance: 'policy',
  philosophy_ethics: 'philosophy',
  economics_markets: 'economics',
  society_culture: 'culture',
  information_knowledge: 'ai-native',
  self_identity: 'ai-native',
  pure_opinion: 'ai-native',
  // subjective_framing and meta_feedback → no tag (meta-categories)
};

// Default threshold values (must match keys seeded in src/index.ts)
const DEFAULT_THRESHOLDS: Array<{ key: string; value: string; label: string; description: string }> = [
  { key: 'domain_min_pct', value: '15', label: 'Domain tag minimum %', description: 'Min % of opinions in a category to earn that domain tag' },
  { key: 'domain_primary_min_pct', value: '25', label: 'Primary domain minimum %', description: 'Min % to be labeled primary domain' },
  { key: 'style_pattern_weight', value: '40', label: 'Answer pattern weight', description: 'Weight (0-100) for answer pattern analysis signal in style classification' },
  { key: 'style_reasoning_weight', value: '25', label: 'Reasoning depth weight', description: 'Weight (0-100) for reasoning/basis text analysis signal in style classification' },
  { key: 'style_distinctiveness_weight', value: '20', label: 'Position distinctiveness weight', description: 'Weight (0-100) for leave-one-out position distinctiveness signal' },
  { key: 'style_profile_weight', value: '15', label: 'Profile keyword weight', description: 'Weight (0-100) for self-reported profile keyword signal' },
  { key: 'min_resolved_for_style', value: '5', label: 'Min resolved for style', description: 'Min resolved-market opinions to classify style' },
];

export async function getThresholds(): Promise<Record<string, number>> {
  const rows = await db.select().from(classificationThresholds);
  const result: Record<string, number> = {};
  for (const row of rows) {
    result[row.key] = parseFloat(row.value);
  }
  return result;
}

export async function updateThreshold(key: string, value: number): Promise<void> {
  if (value < 0 || value > 100) {
    throw new Error('Threshold value must be between 0 and 100');
  }
  const existing = await db.select().from(classificationThresholds).where(eq(classificationThresholds.key, key));
  if (existing.length === 0) {
    throw new Error(`Unknown threshold key: ${key}`);
  }
  await db.update(classificationThresholds)
    .set({ value: String(value), updated_at: new Date().toISOString() })
    .where(eq(classificationThresholds.key, key));
}

export async function seedDefaultThresholds(): Promise<void> {
  const existing = await db.select().from(classificationThresholds);
  const existingKeys = new Set(existing.map(r => r.key));

  const now = new Date().toISOString();
  let seeded = 0;
  for (const t of DEFAULT_THRESHOLDS) {
    if (existingKeys.has(t.key)) continue;
    await db.insert(classificationThresholds).values({
      key: t.key,
      value: t.value,
      label: t.label,
      description: t.description,
      updated_at: now,
    });
    seeded++;
  }
  if (seeded > 0) logger.info({ seeded }, 'Seeded default thresholds');
}

// ── Multi-Signal Style Helpers ─────────────────────────────────────────

type StyleScores = { contrarian: number; consensus_seeker: number; nuanced: number; decisive: number; balanced: number };

const HEDGING_WORDS = /\b(however|although|on the other hand|it depends|arguably|perhaps|possibly|uncertain|may|might|could be|nuanced|complex)\b/gi;
const ASSERTION_WORDS = /\b(clearly|obviously|definitely|certainly|undoubtedly|absolutely|without question|no doubt|must|always|never)\b/gi;

const PROFILE_KEYWORD_MAP: Record<string, Partial<StyleScores>> = {
  // Contrarian signals
  'skeptic': { contrarian: 30 }, 'contrarian': { contrarian: 30 }, 'challenge': { contrarian: 20 },
  'question': { contrarian: 15 }, 'devil': { contrarian: 20 }, 'dissent': { contrarian: 25 },
  'cautious': { contrarian: 15 }, 'critical': { contrarian: 15 },
  // Consensus-seeker signals
  'consensus': { consensus_seeker: 30 }, 'collaborative': { consensus_seeker: 25 },
  'agree': { consensus_seeker: 20 }, 'harmony': { consensus_seeker: 20 },
  'pragmatic': { consensus_seeker: 15 }, 'practical': { consensus_seeker: 15 },
  // Nuanced signals
  'nuanced': { nuanced: 30 }, 'holistic': { nuanced: 25 }, 'contextual': { nuanced: 20 },
  'multi-faceted': { nuanced: 25 }, 'balanced view': { nuanced: 20 }, 'thorough': { nuanced: 15 },
  'comprehensive': { nuanced: 20 },
  // Decisive signals
  'decisive': { decisive: 30 }, 'direct': { decisive: 20 }, 'efficient': { decisive: 20 },
  'clear-cut': { decisive: 25 }, 'binary': { decisive: 20 }, 'data-driven': { decisive: 15 },
  'evidence-based': { decisive: 15 }, 'analytical': { decisive: 15 },
  // Balanced signals
  'balanced': { balanced: 30 }, 'moderate': { balanced: 25 }, 'fair': { balanced: 20 },
  'even-handed': { balanced: 25 }, 'open-minded': { balanced: 20 }, 'flexible': { balanced: 15 },
};

/**
 * Signal 1: Answer Pattern Analysis
 * Measures how an agent answers (binary vs custom, confidence patterns, answer variety).
 */
function analyzeAnswerPatterns(
  agentOpinions: Array<{ answer: string; confidence: number | null }>,
): StyleScores {
  const scores: StyleScores = { contrarian: 0, consensus_seeker: 0, nuanced: 0, decisive: 0, balanced: 0 };
  if (agentOpinions.length === 0) return scores;

  let yesNo = 0, custom = 0, abstain = 0;
  const answerCounts: Record<string, number> = {};
  const confidences: number[] = [];

  for (const op of agentOpinions) {
    const answer = op.answer.toLowerCase();
    answerCounts[answer] = (answerCounts[answer] || 0) + 1;
    if (answer === 'yes' || answer === 'no') yesNo++;
    else if (answer === 'abstain') abstain++;
    else custom++;
    if (op.confidence != null) confidences.push(op.confidence);
  }

  const substantive = yesNo + custom;
  if (substantive === 0) return scores;

  const binaryRatio = yesNo / substantive;
  const customRatio = custom / substantive;

  // Answer entropy (Shannon) — higher = more varied answers
  const total = agentOpinions.length;
  let entropy = 0;
  for (const count of Object.values(answerCounts)) {
    const p = count / total;
    if (p > 0) entropy -= p * Math.log2(p);
  }
  const maxEntropy = Math.log2(Math.max(Object.keys(answerCounts).length, 2));
  const normalizedEntropy = maxEntropy > 0 ? entropy / maxEntropy : 0;

  // Confidence variance — high variance suggests nuanced thinking
  let confidenceMean = 50, confidenceVar = 0;
  if (confidences.length > 0) {
    confidenceMean = confidences.reduce((a, b) => a + b, 0) / confidences.length;
    confidenceVar = confidences.reduce((sum, c) => sum + (c - confidenceMean) ** 2, 0) / confidences.length;
  }
  const normalizedVar = Math.min(confidenceVar / 625, 1); // 625 = 25^2, reasonable max variance

  // Decisive: high binary ratio, high confidence, low entropy
  scores.decisive = Math.round(binaryRatio * 50 + (confidenceMean / 100) * 30 + (1 - normalizedEntropy) * 20);

  // Nuanced: high custom ratio, high variance, high entropy
  scores.nuanced = Math.round(customRatio * 40 + normalizedVar * 30 + normalizedEntropy * 30);

  // Balanced: moderate everything (close to 0.5 binary ratio, mid confidence, moderate entropy)
  const balanceFactor = 1 - Math.abs(binaryRatio - 0.5) * 2; // peaks at 50/50
  scores.balanced = Math.round(balanceFactor * 40 + normalizedEntropy * 30 + (1 - normalizedVar) * 30);

  // Contrarian and consensus_seeker get minimal signal from patterns alone
  // (these are primarily determined by the distinctiveness signal)
  scores.contrarian = Math.round((1 - confidenceMean / 100) * 20 + normalizedVar * 15);
  scores.consensus_seeker = Math.round((confidenceMean / 100) * 20 + (1 - normalizedVar) * 15);

  return scores;
}

/**
 * Signal 2: Reasoning Depth Analysis
 * Analyzes the basis/reasoning text for hedging vs assertive language.
 */
function analyzeReasoningDepth(
  agentOpinions: Array<{ basis: string | null }>,
): StyleScores {
  const scores: StyleScores = { contrarian: 0, consensus_seeker: 0, nuanced: 0, decisive: 0, balanced: 0 };

  const basesWithText = agentOpinions.filter(op => op.basis && op.basis.trim().length > 0);
  if (basesWithText.length === 0) return scores;

  let totalLength = 0, totalHedging = 0, totalAssertion = 0;

  for (const op of basesWithText) {
    const text = op.basis!;
    totalLength += text.length;
    totalHedging += (text.match(HEDGING_WORDS) || []).length;
    totalAssertion += (text.match(ASSERTION_WORDS) || []).length;
  }

  const avgLength = totalLength / basesWithText.length;
  const avgHedging = totalHedging / basesWithText.length;
  const avgAssertion = totalAssertion / basesWithText.length;

  // Normalize: typical basis is 100-500 chars; 0-3 hedging/assertion words
  const lengthScore = Math.min(avgLength / 400, 1); // saturates at 400 chars
  const hedgingScore = Math.min(avgHedging / 2, 1);  // saturates at 2 per opinion
  const assertionScore = Math.min(avgAssertion / 2, 1);

  // Nuanced: long reasoning, lots of hedging
  scores.nuanced = Math.round(lengthScore * 40 + hedgingScore * 40 + (1 - assertionScore) * 20);

  // Decisive: short reasoning, assertive language
  scores.decisive = Math.round((1 - lengthScore) * 30 + assertionScore * 40 + (1 - hedgingScore) * 30);

  // Contrarian: assertive + moderate length (strong opinions with backing)
  scores.contrarian = Math.round(assertionScore * 35 + lengthScore * 25 + (1 - hedgingScore) * 20);

  // Consensus-seeker: hedging language, moderate length
  scores.consensus_seeker = Math.round(hedgingScore * 30 + (1 - assertionScore) * 30 + lengthScore * 20);

  // Balanced: moderate everything
  const moderateLength = 1 - Math.abs(lengthScore - 0.5) * 2;
  scores.balanced = Math.round(moderateLength * 40 + (1 - Math.abs(hedgingScore - assertionScore)) * 30);

  return scores;
}

/**
 * Signal 3: Leave-One-Out Position Distinctiveness
 * For each resolved market, computes the majority excluding this agent,
 * then checks whether the agent agreed or disagreed.
 */
function computePositionDistinctiveness(
  agentId: string,
  opinionWithMarkets: Array<{ opinion: { agent_id: string; answer: string; market_id: string }; market: { id: string; status: string } | null }>,
  allOpinionsByMarket: Map<string, Array<{ agent_id: string; answer: string }>>,
): StyleScores {
  const scores: StyleScores = { contrarian: 0, consensus_seeker: 0, nuanced: 0, decisive: 0, balanced: 0 };

  let withCount = 0, againstCount = 0, totalCompared = 0;

  for (const { opinion, market } of opinionWithMarkets) {
    if (!market || market.status !== 'resolved') continue;
    if (opinion.answer.toLowerCase() === 'abstain') continue;

    const marketOpinions = allOpinionsByMarket.get(market.id);
    if (!marketOpinions || marketOpinions.length < 2) continue;

    const plurality = computePluralityExcluding(marketOpinions, agentId);
    if (!plurality) continue;

    totalCompared++;
    if (opinion.answer.toLowerCase() === plurality.toLowerCase()) {
      withCount++;
    } else {
      againstCount++;
    }
  }

  if (totalCompared === 0) return scores;

  const withPct = withCount / totalCompared;
  const againstPct = againstCount / totalCompared;

  scores.contrarian = Math.round(againstPct * 100);
  scores.consensus_seeker = Math.round(withPct * 100);
  // Balanced: close to 50/50
  scores.balanced = Math.round((1 - Math.abs(withPct - 0.5) * 2) * 80);
  // Nuanced and decisive get minimal signal from position alone
  scores.nuanced = Math.round(againstPct * 30); // slightly contrarian = willing to explore
  scores.decisive = Math.round(withPct * 30);    // going with majority = quick decisions

  return scores;
}

/**
 * Signal 4: Self-Reported Profile Keywords
 * Keyword matching on reasoning_approach profile answer.
 */
async function analyzeProfileKeywords(agentId: string): Promise<StyleScores> {
  const scores: StyleScores = { contrarian: 0, consensus_seeker: 0, nuanced: 0, decisive: 0, balanced: 0 };

  const profileRows = await db.select().from(profileAnswers)
    .where(eq(profileAnswers.agent_id, agentId));

  // Check reasoning_approach and self_description
  const relevantKeys = ['reasoning_approach', 'self_description'];
  const texts = profileRows
    .filter(r => relevantKeys.includes(r.question_key))
    .map(r => r.answer.toLowerCase());

  if (texts.length === 0) return scores;

  const combined = texts.join(' ');

  for (const [keyword, affinities] of Object.entries(PROFILE_KEYWORD_MAP)) {
    if (combined.includes(keyword.toLowerCase())) {
      for (const [style, value] of Object.entries(affinities)) {
        scores[style as keyof StyleScores] += value!;
      }
    }
  }

  // Normalize: cap each at 100
  for (const key of Object.keys(scores) as Array<keyof StyleScores>) {
    scores[key] = Math.min(scores[key], 100);
  }

  return scores;
}

/**
 * Combine four signals into final style scores using configurable weights.
 */
function combineStyleSignals(
  pattern: StyleScores,
  reasoning: StyleScores,
  distinctiveness: StyleScores,
  profile: StyleScores,
  weights: { pattern: number; reasoning: number; distinctiveness: number; profile: number },
): { style: string; score: number } {
  const totalWeight = weights.pattern + weights.reasoning + weights.distinctiveness + weights.profile;
  const styles: Array<keyof StyleScores> = ['contrarian', 'consensus_seeker', 'nuanced', 'decisive', 'balanced'];

  let bestStyle: string = 'balanced';
  let bestScore = 0;

  for (const s of styles) {
    const weighted = (
      pattern[s] * weights.pattern +
      reasoning[s] * weights.reasoning +
      distinctiveness[s] * weights.distinctiveness +
      profile[s] * weights.profile
    ) / totalWeight;

    if (weighted > bestScore) {
      bestScore = weighted;
      bestStyle = s;
    }
  }

  return { style: bestStyle, score: Math.round(bestScore) };
}

export async function computeClassification(agentId: string): Promise<void> {
  const agentRows = await db.select().from(agents).where(eq(agents.id, agentId));
  if (agentRows.length === 0) return;
  const agent = agentRows[0];

  const thresholds = await getThresholds();

  // Fetch all opinions with their markets
  const agentOpinions = await db.select().from(opinions).where(eq(opinions.agent_id, agentId));

  const opinionWithMarkets = await Promise.all(
    agentOpinions.map(async (op) => {
      const marketRows = await db.select().from(markets).where(eq(markets.id, op.market_id));
      return { opinion: op, market: marketRows[0] ?? null };
    }),
  );

  const totalOpinions = agentOpinions.length;

  // --- Domain Expertise ---
  const categoryBreakdown: Record<string, number> = {};
  for (const { market } of opinionWithMarkets) {
    if (!market) continue;
    categoryBreakdown[market.category] = (categoryBreakdown[market.category] || 0) + 1;
  }

  const domainTags: string[] = [];
  let primaryDomain: string | null = null;
  let primaryDomainPct = 0;

  if (totalOpinions > 0) {
    const domainPcts: Record<string, number> = {};
    for (const [category, count] of Object.entries(categoryBreakdown)) {
      const pct = (count / totalOpinions) * 100;
      const tag = CATEGORY_DOMAIN_MAP[category];
      if (!tag) continue; // meta-categories get no tag
      domainPcts[tag] = (domainPcts[tag] || 0) + pct;
    }

    const domainMinPct = thresholds.domain_min_pct ?? 10;
    const domainPrimaryMinPct = thresholds.domain_primary_min_pct ?? 25;

    for (const [tag, pct] of Object.entries(domainPcts)) {
      if (pct >= domainMinPct) {
        domainTags.push(tag);
      }
      if (pct > primaryDomainPct) {
        primaryDomainPct = pct;
        primaryDomain = tag;
      }
    }

    // Primary domain only if it meets the higher threshold
    if (primaryDomainPct < domainPrimaryMinPct) {
      primaryDomain = null;
    }
  }

  // --- Opinion Style (Multi-Signal Classification) ---
  // Compute consensus metrics for backwards-compat fields
  const consensusDistribution = { with_consensus: 0, against_consensus: 0, abstained: 0 };
  for (const { opinion, market } of opinionWithMarkets) {
    if (!market || market.status !== 'resolved') continue;
    if (opinion.answer.toLowerCase() === 'abstain') {
      consensusDistribution.abstained++;
    } else if (market.majority_position && opinion.answer.toLowerCase() === market.majority_position.toLowerCase()) {
      consensusDistribution.with_consensus++;
    } else {
      consensusDistribution.against_consensus++;
    }
  }

  const totalResolved = consensusDistribution.with_consensus + consensusDistribution.against_consensus + consensusDistribution.abstained;
  const minResolvedForStyle = thresholds.min_resolved_for_style ?? 5;

  // Signal 1: Answer patterns
  const patternScores = analyzeAnswerPatterns(
    agentOpinions.map(op => ({ answer: op.answer, confidence: op.confidence })),
  );

  // Signal 2: Reasoning depth
  const reasoningScores = analyzeReasoningDepth(
    agentOpinions.map(op => ({ basis: op.basis })),
  );

  // Signal 3: Leave-one-out position distinctiveness
  // Build a map of all opinions per resolved market for leave-one-out computation
  const resolvedMarketIds = new Set<string>(
    opinionWithMarkets
      .filter(({ market }) => market && market.status === 'resolved')
      .map(({ market }) => market!.id as string),
  );
  const allOpinionsByMarket = new Map<string, Array<{ agent_id: string; answer: string }>>();
  for (const marketId of resolvedMarketIds) {
    const marketOpinions = await db.select({ agent_id: opinions.agent_id, answer: opinions.answer })
      .from(opinions).where(eq(opinions.market_id, marketId));
    allOpinionsByMarket.set(marketId, marketOpinions);
  }
  const distinctivenessScores = computePositionDistinctiveness(agentId, opinionWithMarkets, allOpinionsByMarket);

  // Signal 4: Profile keywords
  const profileScores = await analyzeProfileKeywords(agentId);

  // Combine signals with configurable weights
  const weights = {
    pattern: thresholds.style_pattern_weight ?? 40,
    reasoning: thresholds.style_reasoning_weight ?? 25,
    distinctiveness: thresholds.style_distinctiveness_weight ?? 20,
    profile: thresholds.style_profile_weight ?? 15,
  };

  let opinionStyle = 'unknown';
  let opinionStyleScore = 0;

  if (totalResolved >= minResolvedForStyle) {
    const result = combineStyleSignals(patternScores, reasoningScores, distinctivenessScores, profileScores, weights);
    opinionStyle = result.style;
    opinionStyleScore = result.score;
  } else if (totalOpinions > 0) {
    // Cold start: use profile keywords (60%) + answer patterns (40%), cap at 40
    const coldResult = combineStyleSignals(
      patternScores, { contrarian: 0, consensus_seeker: 0, nuanced: 0, decisive: 0, balanced: 0 },
      { contrarian: 0, consensus_seeker: 0, nuanced: 0, decisive: 0, balanced: 0 }, profileScores,
      { pattern: 40, reasoning: 0, distinctiveness: 0, profile: 60 },
    );
    opinionStyle = coldResult.style;
    opinionStyleScore = Math.min(coldResult.score, 40);
  }

  // --- Agent Type ---
  let derivedAgentType = 'unknown';

  if (agent.agent_type === 'system') {
    derivedAgentType = 'lifecycle_system';
  } else if (agent.agent_type === 'e2e') {
    derivedAgentType = 'research_agent';
  } else {
    // human or null — keyword-match profile_answers
    const profileRows = await db.select().from(profileAnswers)
      .where(eq(profileAnswers.agent_id, agentId));

    const agentTypeAnswer = profileRows.find(r => r.question_key === 'agent_type');
    if (agentTypeAnswer) {
      const answerLower = agentTypeAnswer.answer.toLowerCase();
      if (/assistant|personal|delegate/.test(answerLower)) {
        derivedAgentType = 'personal_assistant';
      } else if (/research|analyst|study/.test(answerLower)) {
        derivedAgentType = 'research_agent';
      } else if (/system|lifecycle|automated/.test(answerLower)) {
        derivedAgentType = 'lifecycle_system';
      }
    }
  }

  // --- Consensus metrics ---
  const totalNonAbstain = consensusDistribution.with_consensus + consensusDistribution.against_consensus;
  const consensusAlignment = totalNonAbstain > 0
    ? Math.round((consensusDistribution.with_consensus / totalNonAbstain) * 100)
    : 0;
  const contrarianRate = totalNonAbstain > 0
    ? Math.round((consensusDistribution.against_consensus / totalNonAbstain) * 100)
    : 0;

  // Last active timestamp
  const lastOpinion = agentOpinions.length > 0
    ? agentOpinions.reduce((latest, op) => op.created_at > latest ? op.created_at : latest, agentOpinions[0].created_at)
    : null;

  const now = new Date().toISOString();

  // Upsert classification
  const existing = await db.select().from(agentClassifications)
    .where(eq(agentClassifications.agent_id, agentId));

  if (existing.length > 0) {
    await db.update(agentClassifications)
      .set({
        domain_tags: JSON.stringify(domainTags),
        primary_domain: primaryDomain,
        opinion_style: opinionStyle,
        opinion_style_score: opinionStyleScore,
        derived_agent_type: derivedAgentType,
        total_opinions_at_compute: totalOpinions,
        consensus_alignment: consensusAlignment,
        contrarian_rate: contrarianRate,
        last_active_at: lastOpinion,
        computed_at: now,
      })
      .where(eq(agentClassifications.agent_id, agentId));
  } else {
    await db.insert(agentClassifications).values({
      id: randomUUID(),
      agent_id: agentId,
      domain_tags: JSON.stringify(domainTags),
      primary_domain: primaryDomain,
      opinion_style: opinionStyle,
      opinion_style_score: opinionStyleScore,
      derived_agent_type: derivedAgentType,
      total_opinions_at_compute: totalOpinions,
      consensus_alignment: consensusAlignment,
      contrarian_rate: contrarianRate,
      last_active_at: lastOpinion,
      computed_at: now,
    });
  }
}

export interface ClassifiedAgent {
  agent_id: string;
  handle: string;
  avatar_url: string | null;
  points_balance: number;
  total_opinions: number;
  participation_rate: number;
  member_since: string;
  last_active_at: string | null;
  domain_tags: string[];
  primary_domain: string | null;
  opinion_style: string;
  opinion_style_score: number;
  derived_agent_type: string;
  consensus_alignment: number;
  contrarian_rate: number;
  agent_type: string | null;
  location_country: string | null;
  location_region: string | null;
  location_city: string | null;
  registration_completed_pct: number;
  registration_answers_count: number;
  registration_total_questions: number;
}

export interface ClassifiedAgentFilters {
  domain?: string;
  style?: string;
  type?: string;
  min_participation?: number;
  min_opinions?: number;
  active_days?: number;
  country?: string;
  sort?: string;
  limit?: number;
  search?: string;
  offset?: number;
  member_since_from?: string;
  member_since_to?: string;
}

export async function getClassifiedAgents(filters: ClassifiedAgentFilters = {}): Promise<{ agents: ClassifiedAgent[]; total: number; countries: string[] }> {
  const allAgents = await db.select().from(agents);
  const allClassifications = await db.select().from(agentClassifications);
  const classMap = new Map(allClassifications.map(c => [c.agent_id, c]));

  // Single aggregated query instead of per-agent N+1
  const opinionCounts = await db
    .select({ agent_id: opinions.agent_id, count: sql<number>`count(*)` })
    .from(opinions)
    .groupBy(opinions.agent_id);
  const opinionCountMap = new Map(opinionCounts.map(r => [r.agent_id, r.count]));

  const [{ count: totalMarkets }] = await db.select({ count: sql<number>`count(*)` }).from(markets);

  // Registration completion: count required-question answers per agent
  const requiredKeySet = new Set(requiredGenesisKeys);
  const allProfileAnswers = await db
    .select({ agent_id: profileAnswers.agent_id, question_key: profileAnswers.question_key })
    .from(profileAnswers);
  const answeredByAgent = new Map<string, Set<string>>();
  for (const a of allProfileAnswers) {
    if (!requiredKeySet.has(a.question_key)) continue;
    let set = answeredByAgent.get(a.agent_id);
    if (!set) {
      set = new Set();
      answeredByAgent.set(a.agent_id, set);
    }
    set.add(a.question_key);
  }
  const totalRequired = requiredGenesisKeys.length;

  let results: ClassifiedAgent[] = [];
  const countrySet = new Set<string>();

  for (const agent of allAgents) {
    const cls = classMap.get(agent.id);
    const opinionCount = opinionCountMap.get(agent.id) || 0;
    const participationRate = totalMarkets > 0 ? Math.round((opinionCount / totalMarkets) * 100) / 100 : 0;
    const domainTags: string[] = cls?.domain_tags ? JSON.parse(cls.domain_tags) : [];
    const answeredCount = answeredByAgent.get(agent.id)?.size ?? 0;
    const regPct = totalRequired === 0 ? 0 : Math.round((answeredCount / totalRequired) * 100);

    const row: ClassifiedAgent = {
      agent_id: agent.id,
      handle: agent.handle,
      avatar_url: agent.avatar_url,
      points_balance: agent.points_balance,
      total_opinions: opinionCount,
      participation_rate: participationRate,
      member_since: agent.created_at,
      last_active_at: cls?.last_active_at ?? null,
      domain_tags: domainTags,
      primary_domain: cls?.primary_domain ?? null,
      opinion_style: cls?.opinion_style ?? 'unknown',
      opinion_style_score: cls?.opinion_style_score ?? 0,
      derived_agent_type: cls?.derived_agent_type ?? 'unknown',
      consensus_alignment: cls?.consensus_alignment ?? 0,
      contrarian_rate: cls?.contrarian_rate ?? 0,
      agent_type: agent.agent_type,
      location_country: agent.location_country ?? null,
      location_region: agent.location_region ?? null,
      location_city: agent.location_city ?? null,
      registration_completed_pct: regPct,
      registration_answers_count: answeredCount,
      registration_total_questions: totalRequired,
    };

    // Collect countries before filtering
    if (row.location_country) countrySet.add(row.location_country);

    // Apply filters
    if (filters.search && !row.handle.toLowerCase().includes(filters.search.toLowerCase())) continue;
    if (filters.country && (row.location_country || '').toUpperCase() !== filters.country.toUpperCase()) continue;
    if (filters.domain && !domainTags.includes(filters.domain)) continue;
    if (filters.style && row.opinion_style !== filters.style) continue;
    if (filters.type && row.derived_agent_type !== filters.type) continue;
    if (filters.min_participation != null && participationRate < filters.min_participation) continue;
    if (filters.min_opinions != null && opinionCount < filters.min_opinions) continue;
    if (filters.active_days != null && row.last_active_at) {
      const cutoff = new Date(Date.now() - filters.active_days * 86400000).toISOString();
      if (row.last_active_at < cutoff) continue;
    }
    if (filters.member_since_from && row.member_since < filters.member_since_from) continue;
    if (filters.member_since_to && row.member_since >= filters.member_since_to) continue;

    results.push(row);
  }

  // Sort
  const sortKey = filters.sort || 'points_balance';
  results.sort((a, b) => {
    switch (sortKey) {
      case 'total_opinions': return b.total_opinions - a.total_opinions;
      case 'participation_rate': return b.participation_rate - a.participation_rate;
      case 'last_active_at':
        return (b.last_active_at || '').localeCompare(a.last_active_at || '');
      case 'member_since':
        return (b.member_since || '').localeCompare(a.member_since || '');
      case 'registration_completed_pct':
        return b.registration_completed_pct - a.registration_completed_pct;
      default: return b.points_balance - a.points_balance;
    }
  });

  const total = results.length;
  if (filters.offset) results = results.slice(filters.offset);
  if (filters.limit) results = results.slice(0, filters.limit);

  return { agents: results, total, countries: Array.from(countrySet).sort() };
}

// ── Pool Analysis ───────────────────────────────────────────────────────

export interface PoolAnalysisQuery {
  category?: string;
  domain?: string;
  style?: string;
  type?: string;
  country?: string;
  min_participation?: number;
  min_opinions?: number;
  active_days?: number;
}

export interface PoolAnalysisResult {
  matching_agents: number;
  highly_active_count: number;
  style_split: Record<string, number>;
  avg_participation_rate: number;
  avg_opinions: number;
  quality_rating: string;
  quality_score: number;
  estimated_participation: { expected_responses: number; confidence: string };
  agents: ClassifiedAgent[];
}

export async function getPoolAnalysis(query: PoolAnalysisQuery): Promise<PoolAnalysisResult> {
  const filters: ClassifiedAgentFilters = {};
  if (query.domain) filters.domain = query.domain;
  if (query.style) filters.style = query.style;
  if (query.type) filters.type = query.type;
  if (query.country) filters.country = query.country;
  if (query.min_participation != null) filters.min_participation = query.min_participation;
  if (query.min_opinions != null) filters.min_opinions = query.min_opinions;
  if (query.active_days != null) filters.active_days = query.active_days;

  let { agents: matchedAgents } = await getClassifiedAgents(filters);

  // Additional category filter (not in ClassifiedAgentFilters)
  if (query.category) {
    // Category filter: agents whose domain_tags contain the mapped domain for this category
    const domainForCategory = CATEGORY_DOMAIN_MAP[query.category];
    if (domainForCategory) {
      matchedAgents = matchedAgents.filter(a => a.domain_tags.includes(domainForCategory));
    }
  }

  const matchingAgents = matchedAgents.length;

  // Highly active = agents with >= 10 opinions (could use a threshold key but using sensible default)
  const highlyActiveCount = matchedAgents.filter(a => a.total_opinions >= 10).length;

  // Style split
  const styleSplit: Record<string, number> = { contrarian: 0, consensus_seeker: 0, nuanced: 0, decisive: 0, balanced: 0 };
  for (const a of matchedAgents) {
    if (styleSplit.hasOwnProperty(a.opinion_style)) {
      styleSplit[a.opinion_style]++;
    }
  }

  // Averages
  const avgParticipationRate = matchingAgents > 0
    ? matchedAgents.reduce((sum, a) => sum + a.participation_rate, 0) / matchingAgents
    : 0;
  const avgOpinions = matchingAgents > 0
    ? matchedAgents.reduce((sum, a) => sum + a.total_opinions, 0) / matchingAgents
    : 0;

  // Quality score
  let qualityScore = 0;
  if (matchingAgents >= 5) qualityScore += 25;
  if (matchingAgents >= 10) qualityScore += 15;
  if (highlyActiveCount >= 3) qualityScore += 20;
  if (avgParticipationRate >= 0.5) qualityScore += 15;
  // Style diversity: 2+ styles with count >= 2
  const diverseStyles = Object.values(styleSplit).filter(c => c >= 2).length;
  if (diverseStyles >= 2) qualityScore += 15;
  if (avgOpinions >= 10) qualityScore += 10;

  let qualityRating: string;
  if (qualityScore >= 71) qualityRating = 'excellent';
  else if (qualityScore >= 51) qualityRating = 'good';
  else if (qualityScore >= 31) qualityRating = 'fair';
  else qualityRating = 'poor';

  // Estimated participation
  const expectedResponses = Math.round(matchingAgents * avgParticipationRate);
  let confidence: string;
  if (matchingAgents >= 10) confidence = 'high';
  else if (matchingAgents >= 5) confidence = 'medium';
  else confidence = 'low';

  return {
    matching_agents: matchingAgents,
    highly_active_count: highlyActiveCount,
    style_split: styleSplit,
    avg_participation_rate: Math.round(avgParticipationRate * 100) / 100,
    avg_opinions: Math.round(avgOpinions * 10) / 10,
    quality_rating: qualityRating,
    quality_score: qualityScore,
    estimated_participation: { expected_responses: expectedResponses, confidence },
    agents: matchedAgents,
  };
}

export async function recomputeAllClassifications(): Promise<{ recomputed: number; skipped: number }> {
  const allAgents = await db.select({ id: agents.id }).from(agents);
  const existingClassifications = await db.select().from(agentClassifications) as Array<{ agent_id: string; total_opinions_at_compute: number | null }>;
  const classMap = new Map(existingClassifications.map(c => [c.agent_id, c]));

  let recomputed = 0;
  let skipped = 0;

  for (const agent of allAgents) {
    // Staleness check: skip if opinion count hasn't changed
    const opinionCount = (await db.select().from(opinions).where(eq(opinions.agent_id, agent.id))).length;
    const existing = classMap.get(agent.id);

    if (existing && existing.total_opinions_at_compute === opinionCount) {
      skipped++;
      continue;
    }

    await computeClassification(agent.id);
    recomputed++;
  }

  logger.info({ recomputed, skipped }, 'Batch classification recompute complete');
  return { recomputed, skipped };
}
