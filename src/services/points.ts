import { db } from '../db/index.js';
import { opinions, agents, pointTransactions, markets } from '../db/schema.js';
import { eq, sql } from 'drizzle-orm';
import { randomUUID } from 'crypto';

export const PARTICIPATION_REWARD = 10; // Legacy flat reward, used as fallback

export async function distributeRewards(marketId: string) {
  const allOpinions = await db.select().from(opinions).where(eq(opinions.market_id, marketId));
  const marketResults = await db.select().from(markets).where(eq(markets.id, marketId));
  const market = marketResults[0];

  // Determine reward pool
  const rewardPool = market?.reward_pool;

  if (allOpinions.length === 0) {
    // No participants — refund pool to maker if this is a funded market
    if (rewardPool && rewardPool > 0 && market.created_by !== 'lifecycle' && market.created_by !== 'admin') {
      const now = new Date().toISOString();

      // Refund reward pool to maker
      await db.insert(pointTransactions).values({
        id: randomUUID(),
        agent_id: market.created_by,
        market_id: marketId,
        amount: rewardPool,
        type: 'pool_refund',
        created_at: now,
      });

      await db.update(agents)
        .set({ points_balance: sql`${agents.points_balance} + ${rewardPool}` })
        .where(eq(agents.id, market.created_by));

      await db.update(markets)
        .set({ reward_distributed: 0 })
        .where(eq(markets.id, marketId));

      return { payouts: [], total_distributed: 0, refunded: rewardPool };
    }

    return { payouts: [], total_distributed: 0 };
  }

  const payouts: Array<{
    agent_id: string;
    answer: string;
    points: number;
  }> = [];

  const now = new Date().toISOString();

  if (rewardPool && rewardPool > 0) {
    // Pool-based distribution: split equally
    const perAgent = Math.floor(rewardPool / allOpinions.length);
    const totalDistributed = perAgent * allOpinions.length;

    for (const opinion of allOpinions) {
      if (perAgent > 0) {
        await db.insert(pointTransactions).values({
          id: randomUUID(),
          agent_id: opinion.agent_id,
          market_id: marketId,
          amount: perAgent,
          type: 'pool_reward',
          created_at: now,
        });

        await db.update(agents)
          .set({ points_balance: sql`${agents.points_balance} + ${perAgent}` })
          .where(eq(agents.id, opinion.agent_id));
      }

      payouts.push({
        agent_id: opinion.agent_id,
        answer: opinion.answer,
        points: perAgent,
      });
    }

    // Update reward_distributed on the market
    await db.update(markets)
      .set({ reward_distributed: totalDistributed })
      .where(eq(markets.id, marketId));

    return { payouts, total_distributed: totalDistributed };
  }

  // Legacy fallback: flat participation reward (for markets without a pool)
  for (const opinion of allOpinions) {
    await db.insert(pointTransactions).values({
      id: randomUUID(),
      agent_id: opinion.agent_id,
      market_id: marketId,
      amount: PARTICIPATION_REWARD,
      type: 'participation',
      created_at: now,
    });

    await db.update(agents)
      .set({ points_balance: sql`${agents.points_balance} + ${PARTICIPATION_REWARD}` })
      .where(eq(agents.id, opinion.agent_id));

    payouts.push({
      agent_id: opinion.agent_id,
      answer: opinion.answer,
      points: PARTICIPATION_REWARD,
    });
  }

  const totalDistributed = payouts.reduce((sum, p) => sum + p.points, 0);
  return { payouts, total_distributed: totalDistributed };
}
