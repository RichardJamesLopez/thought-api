/**
 * Issue #11: Multi-agent simulation test
 *
 * Exercises the full Rish flow:
 * - Registers 10 agents
 * - Has them express opinions on 3 markets
 * - Closes markets, verifies distribution and rewards
 * - Validates edge cases
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
  get,
  post,
  deleteAgent,
  deleteMarket,
} from './helpers';

interface Agent {
  id: string;
  key: string;
  handle: string;
}

describe('Multi-Agent Simulation', () => {
  const agents: Agent[] = [];
  const marketIds: string[] = [];
  const ts = Date.now();

  describe('Phase 1: Register 10 agents', () => {
    it('registers all 10 agents', async () => {
      for (let i = 0; i < 10; i++) {
        const res = await registerAgent(`sim-agent-${i}-${ts}`);
        expect(res.status).toBe(201);
        agents.push({ id: res.body.agent_id, key: res.body.api_key, handle: res.body.handle });
      }
      expect(agents.length).toBe(10);
    });
  });

  describe('Phase 2: Create 3 markets', () => {
    it('creates 3 markets with different categories', async () => {
      const deadline = new Date(Date.now() + 86400000).toISOString();
      const ctx = { articles: [], data_points: [], links: [] };
      const questions = [
        { question: `Sim: Is pizza the best food? (${ts})`, category: 'pure_opinion' },
        { question: `Sim: Was Y2K overhyped? (${ts})`, category: 'subjective_framing' },
        { question: `Sim: Should tipping be abolished? (${ts})`, category: 'pure_opinion' },
      ];

      for (const q of questions) {
        const res = await createMarket({ ...q, description: 'Simulation test', context: ctx, deadline });
        expect(res.status).toBe(201);
        marketIds.push(res.body.id);
      }
      expect(marketIds.length).toBe(3);
    });
  });

  describe('Phase 3: Agents express opinions', () => {
    it('all 10 agents express on market 0 (7 yes, 3 no)', async () => {
      const answers = ['yes', 'yes', 'yes', 'yes', 'yes', 'yes', 'yes', 'no', 'no', 'no'];
      for (let i = 0; i < 10; i++) {
        const res = await expressOpinion(marketIds[0], agents[i].key, answers[i]);
        expect(res.status).toBe(201);
      }
    });

    it('all 10 agents express on market 1 (5-5 tie)', async () => {
      const answers = ['yes', 'yes', 'yes', 'yes', 'yes', 'no', 'no', 'no', 'no', 'no'];
      for (let i = 0; i < 10; i++) {
        const res = await expressOpinion(marketIds[1], agents[i].key, answers[i]);
        expect(res.status).toBe(201);
      }
    });

    it('3 agents express on market 2 (partial participation: 2 no, 1 yes)', async () => {
      const res0 = await expressOpinion(marketIds[2], agents[0].key, 'no');
      expect(res0.status).toBe(201);
      const res1 = await expressOpinion(marketIds[2], agents[1].key, 'no');
      expect(res1.status).toBe(201);
      const res2 = await expressOpinion(marketIds[2], agents[2].key, 'yes');
      expect(res2.status).toBe(201);
    });
  });

  describe('Phase 4: Edge cases', () => {
    it('rejects duplicate opinion with 409', async () => {
      const dup = await expressOpinion(marketIds[0], agents[0].key, 'yes');
      expect(dup.status).toBe(409);
    });

    it('rejects invalid answer with 400', async () => {
      const bad = await expressOpinion(marketIds[0], agents[0].key, 'maybe');
      expect(bad.status).toBe(400);
    });
  });

  describe('Phase 5: Close markets', () => {
    // Pool economics: default admin funding 100, TAKE_RATE 0.6 → reward pool
    // 40 per market, split equally: floor(40/participants) each.
    it('market 0: majority yes, 10 participants, 40 points distributed', async () => {
      const close = await closeMarket(marketIds[0]);
      expect(close.status).toBe(200);
      expect(close.body.majority_position).toBe('yes');
      expect(close.body.total_participants).toBe(10);
      expect(close.body.total_distributed).toBe(40);
    });

    it('market 1: tie defaults to no, 40 points distributed', async () => {
      const close = await closeMarket(marketIds[1]);
      expect(close.status).toBe(200);
      expect(close.body.majority_position).toBe('no');
      expect(close.body.total_distributed).toBe(40);
    });

    it('market 2: majority no, 3 participants, 39 points distributed', async () => {
      const close = await closeMarket(marketIds[2]);
      expect(close.status).toBe(200);
      expect(close.body.majority_position).toBe('no');
      expect(close.body.total_participants).toBe(3);
      // floor(40/3) = 13 per agent × 3 = 39
      expect(close.body.total_distributed).toBe(39);
    });

    it('rejects opinion on closed market with 400', async () => {
      const late = await expressOpinion(marketIds[0], agents[9].key, 'yes');
      expect(late.status).toBe(400);
    });

    it('rejects re-closing resolved market with 400', async () => {
      const reclose = await closeMarket(marketIds[0]);
      expect(reclose.status).toBe(400);
    });
  });

  describe('Phase 6: Verify balances', () => {
    // Per-agent payouts: markets 0/1 pay floor(40/10) = 4 each; market 2 pays
    // floor(40/3) = 13 each.
    it('agent 0 has 21 points (participated in all 3 markets: 4+4+13)', async () => {
      const bal = await getBalance(agents[0].id, agents[0].key);
      expect(bal.body.points_balance).toBe(21);
    });

    it('agent 5 has 8 points (participated in 2 markets: 4+4)', async () => {
      const bal = await getBalance(agents[5].id, agents[5].key);
      expect(bal.body.points_balance).toBe(8);
    });

    it('agent 9 has 8 points (participated in 2 markets: 4+4)', async () => {
      const bal = await getBalance(agents[9].id, agents[9].key);
      expect(bal.body.points_balance).toBe(8);
    });

    it('agent 3 has 8 points (participated in 2 markets: 4+4)', async () => {
      const bal = await getBalance(agents[3].id, agents[3].key);
      expect(bal.body.points_balance).toBe(8);
    });
  });

  describe('Phase 7: Results, History, Stats', () => {
    it('GET results shows 10 participants for market 0', async () => {
      const results = await getResults(marketIds[0]);
      expect(results.status).toBe(200);
      // Results are an anonymized aggregate — no per-agent payouts array.
      expect(results.body.total_participants).toBe(10);
    });

    it('agent 0 has 3 opinions in history', async () => {
      const history = await get(`/agents/${agents[0].id}/history`, agents[0].key);
      expect(history.status).toBe(200);
      expect(history.body.history.length).toBe(3);
    });

    it('agent 0 stats show 3 opinions and 3 markets', async () => {
      const stats = await get(`/agents/${agents[0].id}/stats`, agents[0].key);
      expect(stats.status).toBe(200);
      expect(stats.body.total_opinions).toBe(3);
      expect(stats.body.markets_participated).toBe(3);
    });
  });

  describe('Phase 8: OpenAPI spec', () => {
    it('GET /openapi.json returns valid spec', async () => {
      const spec = await get('/openapi.json');
      expect(spec.status).toBe(200);
      expect(spec.body.openapi).toBe('3.1.0');
      expect(Object.keys(spec.body.paths).length).toBeGreaterThanOrEqual(8);
    });
  });

  afterAll(async () => {
    for (const id of marketIds) {
      await deleteMarket(id).catch(() => {});
    }
    for (const a of agents) {
      await deleteAgent(a.id).catch(() => {});
    }
  });
});
