import { db } from '../db/index.js';
import { agents, opinions, markets } from '../db/schema.js';
import { eq, desc } from 'drizzle-orm';

export interface AgentStats {
  agent_id: string;
  handle: string;
  member_since: string;
  bio: string | null;
  avatar_url: string | null;
  description: string | null;
  points_balance: number;
  total_opinions: number;
  total_abstentions: number;
  category_breakdown: Record<string, number>;
  answer_distribution: Record<string, number>;
  recent_opinions: Array<{
    market_id: string;
    question: string;
    category: string;
    answer: string;
    expressed_at: string;
    basis?: string | null;
  }>;
  provenance_quality: {
    average_score: number | null;
    recent_scores: number[];
  };
  most_active_categories: string[];
  participation_rate: number;
  consensus_distribution: { with_consensus: number; against_consensus: number; abstained: number };
}

export async function computeAgentStats(agentId: string): Promise<AgentStats | null> {
  const agentRows = await db.select().from(agents).where(eq(agents.id, agentId));
  if (agentRows.length === 0) return null;
  const agent = agentRows[0];

  const agentOpinions = await db
    .select()
    .from(opinions)
    .where(eq(opinions.agent_id, agentId))
    .orderBy(desc(opinions.created_at));

  const opinionWithMarkets = await Promise.all(
    agentOpinions.map(async (op) => {
      const marketRows = await db.select().from(markets).where(eq(markets.id, op.market_id));
      return { opinion: op, market: marketRows[0] ?? null };
    }),
  );

  const totalOpinions = agentOpinions.length;
  const totalAbstentions = agentOpinions.filter((op) => op.answer === 'abstain').length;

  const categoryBreakdown: Record<string, number> = {};
  for (const { market } of opinionWithMarkets) {
    if (!market) continue;
    categoryBreakdown[market.category] = (categoryBreakdown[market.category] || 0) + 1;
  }

  const answerDistribution: Record<string, number> = { yes: 0, no: 0, abstain: 0, custom: 0 };
  for (const op of agentOpinions) {
    const answer = op.answer.toLowerCase();
    if (answer === 'yes' || answer === 'no' || answer === 'abstain') {
      answerDistribution[answer]++;
    } else {
      answerDistribution['custom']++;
    }
  }

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

  const recentOpinions = opinionWithMarkets.slice(0, 10).map(({ opinion, market }) => {
    const entry: {
      market_id: string;
      question: string;
      category: string;
      answer: string;
      expressed_at: string;
      basis?: string | null;
    } = {
      market_id: opinion.market_id,
      question: market?.question ?? 'Unknown',
      category: market?.category ?? 'unknown',
      answer: opinion.answer,
      expressed_at: opinion.created_at,
    };
    if (opinion.basis != null) {
      entry.basis = opinion.basis;
    }
    return entry;
  });

  const provenanceScores = agentOpinions
    .map((op) => op.provenance_score)
    .filter((s): s is number => s !== null && s !== undefined)
    .map((s) => Number(s))
    .filter((s) => !Number.isNaN(s));
  const recentScores = provenanceScores.slice(0, 10);
  const avgScore = provenanceScores.length > 0
    ? parseFloat((provenanceScores.reduce((sum, v) => sum + v, 0) / provenanceScores.length).toFixed(2))
    : null;

  const mostActiveCategories = Object.entries(categoryBreakdown)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => cat);

  const resolvedMarkets = await db
    .select()
    .from(markets)
    .where(eq(markets.status, 'resolved'));
  const resolvedSinceMembership = resolvedMarkets.filter(
    (m) => m.created_at >= agent.created_at,
  );
  // Count only opinions on resolved markets for a true 0-100% rate
  const opinionsOnResolved = opinionWithMarkets.filter(
    ({ market }) => market && market.status === 'resolved'
  ).length;
  const participationRate =
    resolvedSinceMembership.length > 0
      ? parseFloat((opinionsOnResolved / resolvedSinceMembership.length).toFixed(4))
      : 0;

  return {
    agent_id: agent.id,
    handle: agent.handle,
    member_since: agent.created_at,
    bio: agent.bio ?? null,
    avatar_url: agent.avatar_url ?? null,
    description: agent.description ?? null,
    points_balance: agent.points_balance,
    total_opinions: totalOpinions,
    total_abstentions: totalAbstentions,
    category_breakdown: categoryBreakdown,
    answer_distribution: answerDistribution,
    recent_opinions: recentOpinions,
    provenance_quality: {
      average_score: avgScore,
      recent_scores: recentScores,
    },
    most_active_categories: mostActiveCategories,
    participation_rate: participationRate,
    consensus_distribution: consensusDistribution,
  };
}
