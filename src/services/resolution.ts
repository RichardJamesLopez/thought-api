import { db } from '../db/index.js';
import { opinions, markets } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { safeJsonParse } from '../utils.js';

export async function tallyMarket(marketId: string) {
  const allOpinions = await db.select().from(opinions).where(eq(opinions.market_id, marketId));

  if (allOpinions.length === 0) {
    return { majority_position: null, vote_counts: {} as Record<string, number>, total: 0, abstentions: 0, is_longform: false };
  }

  // Check if market has custom answer options
  const marketResults = await db.select().from(markets).where(eq(markets.id, marketId));
  const market = marketResults[0];

  // Longform markets don't have vote counting — skip tally
  const answerType = market?.answer_type || 'binary';
  if (answerType === 'longform') {
    return { majority_position: null, vote_counts: {} as Record<string, number>, total: allOpinions.length, abstentions: 0, is_longform: true };
  }

  // Separate abstentions from substantive votes
  const abstentions = allOpinions.filter(p => p.answer === 'abstain').length;
  const substantiveOpinions = allOpinions.filter(p => p.answer !== 'abstain');

  if (answerType === 'single_choice' || answerType === 'multi_choice' || answerType === 'ranking') {
    const answerOptions = market?.answer_options ? safeJsonParse<string[] | null>(market.answer_options, null) : null;

    if (answerType === 'single_choice' && answerOptions) {
      // Single choice: count each option, majority = most votes
      const voteCounts: Record<string, number> = {};
      for (const opt of answerOptions) {
        if (opt === 'abstain') continue;
        voteCounts[opt] = substantiveOpinions.filter(p => p.answer === opt).length;
      }

      if (substantiveOpinions.length === 0) {
        return { majority_position: null, vote_counts: voteCounts, total: allOpinions.length, abstentions };
      }

      let majorityPosition = Object.keys(voteCounts)[0] || null;
      let maxVotes = 0;
      for (const opt of Object.keys(voteCounts)) {
        if (voteCounts[opt] > maxVotes) {
          maxVotes = voteCounts[opt];
          majorityPosition = opt;
        }
      }
      return { majority_position: majorityPosition, vote_counts: voteCounts, total: allOpinions.length, abstentions };
    }

    if (answerType === 'multi_choice' && answerOptions) {
      // Multi choice: each selected option in the JSON array gets +1
      const voteCounts: Record<string, number> = {};
      for (const opt of answerOptions) {
        voteCounts[opt] = 0;
      }
      for (const op of substantiveOpinions) {
        try {
          const selections = JSON.parse(op.answer) as string[];
          if (Array.isArray(selections)) {
            for (const sel of selections) {
              const matched = answerOptions.find(o => o.toLowerCase() === sel.toLowerCase());
              if (matched) voteCounts[matched]++;
            }
          }
        } catch {
          // If answer isn't valid JSON array, try exact match (backward compat)
          if (answerOptions.includes(op.answer)) voteCounts[op.answer]++;
        }
      }

      if (substantiveOpinions.length === 0) {
        return { majority_position: null, vote_counts: voteCounts, total: allOpinions.length, abstentions };
      }

      let majorityPosition = Object.keys(voteCounts)[0] || null;
      let maxVotes = 0;
      for (const opt of Object.keys(voteCounts)) {
        if (voteCounts[opt] > maxVotes) {
          maxVotes = voteCounts[opt];
          majorityPosition = opt;
        }
      }
      return { majority_position: majorityPosition, vote_counts: voteCounts, total: allOpinions.length, abstentions };
    }

    if (answerType === 'ranking' && answerOptions) {
      // Borda count: top-ranked gets N points, second gets N-1, etc.
      const scores: Record<string, number> = {};
      for (const opt of answerOptions) {
        scores[opt] = 0;
      }
      const n = answerOptions.length;
      for (const op of substantiveOpinions) {
        try {
          const ranking = JSON.parse(op.answer) as string[];
          if (Array.isArray(ranking)) {
            for (let i = 0; i < ranking.length; i++) {
              const matched = answerOptions.find(o => o.toLowerCase() === ranking[i].toLowerCase());
              if (matched) scores[matched] += (n - i);
            }
          }
        } catch { /* skip invalid */ }
      }

      if (substantiveOpinions.length === 0) {
        return { majority_position: null, vote_counts: scores, total: allOpinions.length, abstentions };
      }

      let majorityPosition = Object.keys(scores)[0] || null;
      let maxScore = 0;
      for (const opt of Object.keys(scores)) {
        if (scores[opt] > maxScore) {
          maxScore = scores[opt];
          majorityPosition = opt;
        }
      }
      return { majority_position: majorityPosition, vote_counts: scores, total: allOpinions.length, abstentions };
    }

    // Fallback for missing options
    return { majority_position: null, vote_counts: {} as Record<string, number>, total: allOpinions.length, abstentions };
  }

  if (answerType === 'scale') {
    // Scale: compute histogram and mean
    const scaleConfig = market?.answer_options ? safeJsonParse<{ min: number; max: number } | null>(market.answer_options, null) : null;
    const voteCounts: Record<string, number> = {};
    const values: number[] = [];

    for (const op of substantiveOpinions) {
      const num = Number(op.answer);
      if (!isNaN(num)) {
        values.push(num);
        const key = String(num);
        voteCounts[key] = (voteCounts[key] || 0) + 1;
      }
    }

    if (values.length === 0) {
      return { majority_position: null, vote_counts: voteCounts, total: allOpinions.length, abstentions };
    }

    const mean = Math.round(values.reduce((s, v) => s + v, 0) / values.length);
    return { majority_position: String(mean), vote_counts: voteCounts, total: allOpinions.length, abstentions };
  }

  // Binary yes/no — only count substantive votes
  const yesCount = substantiveOpinions.filter(p => p.answer === 'yes').length;
  const noCount = substantiveOpinions.filter(p => p.answer === 'no').length;

  // If all participants abstained, no majority position
  if (substantiveOpinions.length === 0) {
    return {
      majority_position: null,
      vote_counts: { yes: 0, no: 0 },
      total: allOpinions.length,
      abstentions,
    };
  }

  // Ties default to "no"
  const majorityPosition = yesCount > noCount ? 'yes' : 'no';

  return {
    majority_position: majorityPosition,
    vote_counts: { yes: yesCount, no: noCount },
    total: allOpinions.length,
    abstentions,
  };
}

/**
 * Compute the plurality position for a set of opinions, excluding one agent.
 * Pure function — no DB access. Breaks the circular dependency in style classification
 * by removing the agent being classified from the consensus calculation.
 */
export function computePluralityExcluding(
  allOpinions: Array<{ agent_id: string; answer: string }>,
  excludeAgentId: string,
): string | null {
  const others = allOpinions.filter(op => op.agent_id !== excludeAgentId && op.answer.toLowerCase() !== 'abstain');
  if (others.length === 0) return null;

  const counts: Record<string, number> = {};
  for (const op of others) {
    const answer = op.answer.toLowerCase();
    counts[answer] = (counts[answer] || 0) + 1;
  }

  let maxAnswer: string | null = null;
  let maxCount = 0;
  for (const [answer, count] of Object.entries(counts)) {
    if (count > maxCount) {
      maxCount = count;
      maxAnswer = answer;
    }
  }
  return maxAnswer;
}
