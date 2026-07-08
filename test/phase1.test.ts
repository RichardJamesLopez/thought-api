/**
 * Phase 1 Integration Tests for Thought API
 *
 * Covers Issues #1-6:
 *   #1 - Project scaffolding (health check, DB)
 *   #2 - Auth middleware (401 on bad key, pass on good key)
 *   #3 - Agent registration + balance
 *   #4 - Market CRUD + admin creation
 *   #5 - Opinion submission
 *   #6 - Market resolution + participation rewards
 */

import { describe, it, expect, afterAll } from 'vitest';
import {
  getBaseUrl,
  getAdminKey,
  registerAgent,
  createMarket,
  expressOpinion,
  closeMarket,
  getBalance,
  getResults,
  deleteAgent,
  deleteMarket,
} from './helpers';

const createdAgentIds: string[] = [];
const createdMarketIds: string[] = [];

describe('Issue #1: Scaffolding + Health', () => {
  it('GET /health returns 200 with status ok', async () => {
    const res = await fetch(`${getBaseUrl()}/health`);
    const body = await res.json();
    expect(res.status).toBe(200);
    expect(body.status).toBe('ok');
    expect(body.service).toBe('thought-api');
  });
});

describe('Issue #2: Auth Middleware', () => {
  it('returns 401 with no auth header', async () => {
    const res = await fetch(`${getBaseUrl()}/agents/test-id/balance`);
    expect(res.status).toBe(401);
  });

  it('returns 401 with invalid API key', async () => {
    const res = await fetch(`${getBaseUrl()}/agents/test-id/balance`, {
      headers: { Authorization: 'Bearer bad-key-that-does-not-exist' },
    });
    expect(res.status).toBe(401);
  });

  it('returns 401 with malformed auth header (no Bearer)', async () => {
    const res = await fetch(`${getBaseUrl()}/agents/test-id/balance`, {
      headers: { Authorization: 'Token something' },
    });
    expect(res.status).toBe(401);
  });

  it('returns 403 with wrong admin key', async () => {
    const res = await fetch(`${getBaseUrl()}/admin/api/markets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: 'Bearer wrong-admin-key',
      },
      body: JSON.stringify({ question: 'test' }),
    });
    expect(res.status).toBe(403);
  });

  it('returns 401 on admin endpoint with no auth', async () => {
    const res = await fetch(`${getBaseUrl()}/admin/api/markets`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ question: 'test' }),
    });
    expect(res.status).toBe(401);
  });
});

describe('Issues #3-6: Agent → Market → Opinion → Resolution flow', () => {
  let agentId: string;
  let apiKey: string;
  let marketId: string;
  let agentData: Array<{ id: string; key: string }>;

  // ── Issue #3: Agent Registration ──

  it('registers a new agent', async () => {
    const reg = await registerAgent('phase1-test-agent');
    expect(reg.status).toBe(201);
    expect(reg.body.agent_id).toBeTypeOf('string');
    expect(reg.body.api_key).toBeTypeOf('string');
    expect(reg.body.handle).toBe('phase1-test-agent');
    agentId = reg.body.agent_id;
    apiKey = reg.body.api_key;
    createdAgentIds.push(agentId);
  });

  it('rejects duplicate handle with 409', async () => {
    const dup = await registerAgent('phase1-test-agent');
    expect(dup.status).toBe(409);
  });

  it('rejects missing handle with 400', async () => {
    const res = await fetch(`${getBaseUrl()}/agents/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({}),
    });
    expect(res.status).toBe(400);
  });

  it('new agent has zero balance and no transactions', async () => {
    const bal = await getBalance(agentId, apiKey);
    expect(bal.status).toBe(200);
    expect(bal.body.points_balance).toBe(0);
    expect(bal.body.transactions).toEqual([]);
  });

  it('returns 403 for another agent\'s balance (ownership check precedes existence)', async () => {
    const notFound = await getBalance('non-existent-id', apiKey);
    expect(notFound.status).toBe(403);
  });

  // ── Issue #4: Market CRUD ──

  it('admin creates a market', async () => {
    const deadline = new Date(Date.now() + 86400000).toISOString();
    const created = await createMarket({
      question: 'Test: Is water wet?',
      description: 'A classic philosophical question.',
      context: {
        articles: [{ title: 'Water Properties', url: 'https://example.com', summary: 'Water is a liquid.' }],
        data_points: [{ label: 'Boiling point', value: '100°C', source: 'Physics' }],
        links: [],
      },
      category: 'pure_opinion',
      deadline,
    });
    expect(created.status).toBe(201);
    expect(created.body.id).toBeTypeOf('string');
    expect(created.body.question).toBe('Test: Is water wet?');
    expect(created.body.status).toBe('open');
    expect(created.body.context?.articles?.length).toBe(1);
    marketId = created.body.id;
    createdMarketIds.push(marketId);
  });

  it('rejects invalid category with 400', async () => {
    const deadline = new Date(Date.now() + 86400000).toISOString();
    const badCat = await createMarket({
      question: 'Bad category',
      description: 'test',
      context: { articles: [], data_points: [], links: [] },
      category: 'invalid_category',
      deadline,
    });
    expect(badCat.status).toBe(400);
  });

  it('rejects missing required fields with 400', async () => {
    const res = await fetch(`${getBaseUrl()}/admin/api/markets`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${getAdminKey()}`,
      },
      body: JSON.stringify({ question: 'Incomplete' }),
    });
    expect(res.status).toBe(400);
  });

  it('lists markets including the created one', async () => {
    const res = await fetch(`${getBaseUrl()}/markets`);
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(Array.isArray(body.markets)).toBe(true);
    const testMarket = body.markets.find((m: any) => m.id === marketId);
    expect(testMarket).toBeDefined();
    expect(testMarket?.context?.articles?.length).toBe(1);
  });

  it('gets single market by id', async () => {
    const res = await fetch(`${getBaseUrl()}/markets/${marketId}`);
    const body = await res.json() as any;
    expect(res.status).toBe(200);
    expect(body.id).toBe(marketId);
    expect(body.context?.data_points?.length).toBe(1);
  });

  it('returns 404 for non-existent market', async () => {
    const res = await fetch(`${getBaseUrl()}/markets/non-existent-id`);
    expect(res.status).toBe(404);
  });

  it('filters markets by category', async () => {
    const res = await fetch(`${getBaseUrl()}/markets?category=pure_opinion`);
    const body = await res.json() as any;
    expect(body.markets.every((m: any) => m.category === 'pure_opinion')).toBe(true);
  });

  it('filters markets by status', async () => {
    const res = await fetch(`${getBaseUrl()}/markets?status=resolved`);
    const body = await res.json() as any;
    const ourMarket = body.markets.find((m: any) => m.id === marketId);
    expect(ourMarket).toBeUndefined();
  });

  // ── Issue #5: Opinion Submission ──

  it('registers 5 agents and submits opinions', async () => {
    agentData = [];
    for (let i = 0; i < 5; i++) {
      const reg = await registerAgent(`opiner-${i}-${Date.now()}`);
      agentData.push({ id: reg.body.agent_id, key: reg.body.api_key });
      createdAgentIds.push(reg.body.agent_id);
    }

    const op1 = await expressOpinion(marketId, agentData[0].key, 'yes');
    expect(op1.status).toBe(201);
    expect(op1.body.answer).toBe('yes');
    expect(op1.body.market_id).toBe(marketId);
  });

  it('rejects duplicate opinion with 409', async () => {
    const dup = await expressOpinion(marketId, agentData[0].key, 'no');
    expect(dup.status).toBe(409);
  });

  it('rejects invalid answer with 400', async () => {
    const bad = await expressOpinion(marketId, agentData[1].key, 'maybe');
    expect(bad.status).toBe(400);
  });

  it('returns 404 for opinion on non-existent market', async () => {
    const noMarket = await expressOpinion('non-existent', agentData[1].key, 'yes');
    expect(noMarket.status).toBe(404);
  });

  it('returns 401 for opinion without auth', async () => {
    const res = await fetch(`${getBaseUrl()}/markets/${marketId}/express`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ answer: 'yes' }),
    });
    expect(res.status).toBe(401);
  });

  it('submits remaining opinions (3 yes, 1 no total)', async () => {
    await expressOpinion(marketId, agentData[1].key, 'yes');
    await expressOpinion(marketId, agentData[2].key, 'yes');
    await expressOpinion(marketId, agentData[3].key, 'no');
    // agent[4] does not express (tests partial participation)
  });

  it('returns 400 for results before resolution', async () => {
    const earlyResults = await getResults(marketId);
    expect(earlyResults.status).toBe(400);
  });

  // ── Issue #6: Resolution + Rewards ──

  it('closes market with correct majority and payouts', async () => {
    const close = await closeMarket(marketId);
    expect(close.status).toBe(200);
    expect(close.body.majority_position).toBe('yes');
    expect(close.body.vote_counts.yes).toBe(3);
    expect(close.body.vote_counts.no).toBe(1);
    expect(close.body.total_participants).toBe(4);
    expect(close.body.total_distributed).toBeGreaterThan(0);

    const payouts = close.body.payouts as Array<{ agent_id: string; answer: string; points: number }>;
    expect(payouts.length).toBe(4);

    const yesPayout = payouts.find((p) => p.answer === 'yes');
    expect(yesPayout?.points).toBe(10);

    const noPayout = payouts.find((p) => p.answer === 'no');
    expect(noPayout?.points).toBe(10);

    expect(close.body.total_distributed).toBe(40);
  });

  it('rejects re-closing resolved market with 400', async () => {
    const reclose = await closeMarket(marketId);
    expect(reclose.status).toBe(400);
  });

  it('returns 404 for closing non-existent market', async () => {
    const noMarket = await closeMarket('non-existent');
    expect(noMarket.status).toBe(404);
  });

  it('rejects opinion on closed market with 400', async () => {
    const lateOp = await expressOpinion(marketId, agentData[4].key, 'yes');
    expect(lateOp.status).toBe(400);
  });

  it('participants have correct balances after resolution', async () => {
    const bal0 = await getBalance(agentData[0].id, agentData[0].key);
    expect(bal0.body.points_balance).toBe(10);
    expect(bal0.body.transactions.length).toBe(1);

    const bal3 = await getBalance(agentData[3].id, agentData[3].key);
    expect(bal3.body.points_balance).toBe(10);
    expect(bal3.body.transactions.length).toBe(1);

    const bal4 = await getBalance(agentData[4].id, agentData[4].key);
    expect(bal4.body.points_balance).toBe(0);
  });

  it('GET results withholds data below the k-anonymity threshold', async () => {
    // Results are an anonymized aggregate (src/services/results.ts) gated by
    // K_ANONYMITY_THRESHOLD (default 5). This market has 4 participants, so
    // the API deliberately withholds the breakdown.
    const results = await getResults(marketId);
    expect(results.status).toBe(200);
    expect(results.body.status).toBe('insufficient_participation');
    expect(results.body.participants_below_threshold).toBe(true);
  });
});

describe('Issue #6 Edge Cases', () => {
  it('closes market with zero opinions', async () => {
    const deadline = new Date(Date.now() + 86400000).toISOString();
    const ctx = { articles: [], data_points: [], links: [] };

    const empty = await createMarket({
      question: 'Edge: Zero opinions?',
      description: 'No one will answer this.',
      context: ctx,
      category: 'pure_opinion',
      deadline,
    });
    createdMarketIds.push(empty.body.id);
    const emptyClose = await closeMarket(empty.body.id);
    expect(emptyClose.status).toBe(200);
    expect(emptyClose.body.majority_position).toBeNull();
    expect(emptyClose.body.total_participants).toBe(0);
    expect(emptyClose.body.total_distributed).toBe(0);
  });

  it('handles 50/50 tie (defaults majority to "no")', async () => {
    const deadline = new Date(Date.now() + 86400000).toISOString();
    const ctx = { articles: [], data_points: [], links: [] };

    const tie = await createMarket({
      question: 'Edge: Tie breaker?',
      description: 'An even split.',
      context: ctx,
      category: 'subjective_framing',
      deadline,
    });
    const tieId = tie.body.id;
    createdMarketIds.push(tieId);

    const a1 = await registerAgent(`tie-agent-1-${Date.now()}`);
    const a2 = await registerAgent(`tie-agent-2-${Date.now()}`);
    createdAgentIds.push(a1.body.agent_id, a2.body.agent_id);
    await expressOpinion(tieId, a1.body.api_key, 'yes');
    await expressOpinion(tieId, a2.body.api_key, 'no');

    const tieClose = await closeMarket(tieId);
    expect(tieClose.status).toBe(200);
    expect(tieClose.body.majority_position).toBe('no');
    expect(tieClose.body.vote_counts.yes).toBe(1);
    expect(tieClose.body.vote_counts.no).toBe(1);

    // Pool economics: default funding 100, TAKE_RATE 0.6 → reward pool 40,
    // split equally across 2 participants = 20 each.
    const noVoterPayout = tieClose.body.payouts.find((p: any) => p.answer === 'no');
    const yesVoterPayout = tieClose.body.payouts.find((p: any) => p.answer === 'yes');
    expect(noVoterPayout?.points).toBe(20);
    expect(yesVoterPayout?.points).toBe(20);
    expect(tieClose.body.total_distributed).toBe(40);
  });
});

afterAll(async () => {
  for (const id of createdMarketIds) {
    await deleteMarket(id).catch(() => {});
  }
  for (const id of createdAgentIds) {
    await deleteAgent(id).catch(() => {});
  }
});
