import { db } from '../db/index.js';
import { markets } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { tallyMarket } from './resolution.js';
import { distributeRewards } from './points.js';
import { recomputeAllClassifications } from './classification.js';
import {
  ensureCurrentDaySessions,
  getDueScheduledSessions,
  getExpiredActiveSessions,
  markSessionStatus,
} from './sessions.js';
import { populateUpcomingSessionsFromFunnels } from './funnel-scheduler.js';
import logger from '../logger.js';

// Check every 1 min with small jitter (50-70s)
const BASE_INTERVAL_MS = 60 * 1000;
const JITTER_MS = 20 * 1000; // +/- 10s

export function startLifecycleScheduler() {
  logger.info('Scheduler started (interval ~1min, activates AM/PM sessions)');

  // Run immediately on boot
  runLifecycleCheck();

  // Schedule with jitter
  let timeoutId: ReturnType<typeof setTimeout>;
  function scheduleNext() {
    const jitter = (Math.random() - 0.5) * JITTER_MS;
    const interval = BASE_INTERVAL_MS + jitter;
    timeoutId = setTimeout(async () => {
      await runLifecycleCheck();
      scheduleNext();
    }, interval);
  }
  scheduleNext();

  return () => {
    clearTimeout(timeoutId);
    logger.info('Scheduler stopped');
  };
}

async function runLifecycleCheck() {
  logger.info('Running lifecycle check');

  try {
    ensureCurrentDaySessions();
    await populateUpcomingSessionsFromFunnels();
    await activateDueSessions();
    await activateStandaloneScheduledMarkets();
    await closeExpiredMarkets();
    completeExpiredSessions();
    await recomputeAllClassifications();
  } catch (err) {
    logger.error({ err }, 'Error during lifecycle check');
  }
}

async function activateDueSessions() {
  const dueSessions = getDueScheduledSessions();

  for (const session of dueSessions) {
    const sessionMarkets = await db
      .select()
      .from(markets)
      .where(eq(markets.session_id, session.id));

    const scheduledMarkets = sessionMarkets.filter(m => m.status === 'scheduled');

    for (const market of scheduledMarkets) {
      await db.update(markets)
        .set({
          status: 'open',
          scheduled_start: session.scheduled_start_utc,
          deadline: session.deadline_utc,
        })
        .where(eq(markets.id, market.id));
      logger.info({ market: market.question, sessionId: session.id }, 'Activated session market');
    }

    markSessionStatus(session.id, 'active');
    logger.info({ sessionId: session.id, count: scheduledMarkets.length }, 'Session marked active');
  }
}

// Keep support for legacy standalone scheduled markets (without session_id)
async function activateStandaloneScheduledMarkets() {
  const now = new Date().toISOString();

  const scheduled = await db
    .select()
    .from(markets)
    .where(eq(markets.status, 'scheduled'));

  const ready = scheduled.filter(m => !m.session_id && m.scheduled_start && m.scheduled_start <= now);

  for (const market of ready) {
    await db.update(markets)
      .set({ status: 'open' })
      .where(eq(markets.id, market.id));
    logger.info({ market: market.question }, 'Activated standalone scheduled market');
  }

  if (ready.length > 0) {
    logger.info({ count: ready.length }, 'Activated standalone scheduled markets');
  }
}

function completeExpiredSessions() {
  const expiredSessions = getExpiredActiveSessions();
  for (const session of expiredSessions) {
    markSessionStatus(session.id, 'completed');
    logger.info({ sessionId: session.id }, 'Session marked completed');
  }
}

async function closeExpiredMarkets() {
  const now = new Date().toISOString();

  const openMarkets = await db
    .select()
    .from(markets)
    .where(eq(markets.status, 'open'));

  const expired = openMarkets.filter(m => m.deadline <= now);
  logger.info({ open: openMarkets.length, expired: expired.length }, 'Market expiry check');

  for (const market of expired) {
    try {
      logger.info({ market: market.question }, 'Closing expired market');

      const tally = await tallyMarket(market.id);

      await db.update(markets)
        .set({
          status: 'resolved',
          majority_position: tally.majority_position,
        })
        .where(eq(markets.id, market.id));

      if (tally.total > 0) {
        const rewardResult = await distributeRewards(market.id);
        logger.info({
          majority: tally.majority_position,
          distributed: rewardResult.total_distributed,
          agents: rewardResult.payouts.length,
        }, 'Market resolved with rewards');
      } else {
        logger.info('Market resolved with no opinions');
      }
    } catch (err) {
      logger.error({ err, marketId: market.id }, 'Failed to close market');
    }
  }

  if (expired.length > 0) {
    logger.info({ count: expired.length }, 'Closed expired markets');
  }
}
