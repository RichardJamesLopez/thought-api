/**
 * Agent Profile E2E Tests (Issue #76)
 *
 * Covers:
 *   - PUT /agents/:id/profile — metadata CRUD + validation
 *   - GET /agents/:id/profile — includes new metadata fields
 *   - GET /profiles/:handle — authenticated HTML profile page
 *   - Auth boundaries (owner-only, admin access)
 *   - Full flow with market participation
 */

import { describe, it, expect, afterAll } from 'vitest';
import {
  getBaseUrl,
  getAdminKey,
  registerAgent,
  createMarket,
  deleteMarket,
  deleteAgent,
  expressOpinion,
  updateProfile,
  getProfile,
  getProfilePage,
  get,
} from './helpers';

describe('Agent Profile E2E (Issue #76)', () => {
  const ts = Date.now();
  let agentId: string;
  let apiKey: string;
  let agent1Handle: string;
  let agent2: any;
  const createdMarketIds: string[] = [];
  const createdAgentIds: string[] = [];

  describe('Suite 1: Profile metadata CRUD', () => {
    it('registers agent for profile tests', async () => {
      const agent1 = await registerAgent(`profile-test-${ts}`);
      expect(agent1.status).toBe(201);
      agentId = agent1.body.agent_id;
      apiKey = agent1.body.api_key;
      agent1Handle = agent1.body.handle;
      createdAgentIds.push(agentId);
    });

    it('full profile update', async () => {
      const update = await updateProfile(agentId, apiKey, {
        bio: 'I am a test agent specializing in opinions.',
        avatar_url: 'https://example.com/avatar.png',
        description: 'Test Agent',
      });
      expect(update.status).toBe(200);
      expect(update.body.bio).toBe('I am a test agent specializing in opinions.');
      expect(update.body.avatar_url).toBe('https://example.com/avatar.png');
      expect(update.body.description).toBe('Test Agent');
    });

    it('partial update only changes specified fields', async () => {
      const update = await updateProfile(agentId, apiKey, { bio: 'Updated bio only' });
      expect(update.status).toBe(200);
      expect(update.body.bio).toBe('Updated bio only');
      expect(update.body.avatar_url).toBe('https://example.com/avatar.png');
      expect(update.body.description).toBe('Test Agent');
    });

    it('GET profile includes all fields', async () => {
      const profile = await getProfile(agentId, apiKey);
      expect(profile.status).toBe(200);
      expect(profile.body.bio).toBe('Updated bio only');
      expect(profile.body.avatar_url).toBe('https://example.com/avatar.png');
      expect(profile.body.description).toBe('Test Agent');
      expect(profile.body.total_opinions).toBeTypeOf('number');
    });
  });

  describe('Suite 2: Validation', () => {
    it('rejects bio > 500 chars', async () => {
      const val = await updateProfile(agentId, apiKey, { bio: 'x'.repeat(501) });
      expect(val.status).toBe(400);
    });

    it('rejects description > 200 chars', async () => {
      const val = await updateProfile(agentId, apiKey, { description: 'y'.repeat(201) });
      expect(val.status).toBe(400);
    });

    it('rejects empty body', async () => {
      const val = await updateProfile(agentId, apiKey, {});
      expect(val.status).toBe(400);
    });
  });

  describe('Suite 3: Auth boundaries', () => {
    it('registers second agent', async () => {
      const reg = await registerAgent(`profile-test-other-${ts}`);
      expect(reg.status).toBe(201);
      agent2 = reg.body;
      createdAgentIds.push(agent2.agent_id);
    });

    it('agent cannot PUT another agent\'s profile', async () => {
      const res = await updateProfile(agentId, agent2.api_key, { bio: 'Hacked!' });
      expect(res.status).toBe(403);
    });

    it('unauthenticated PUT returns 401', async () => {
      const res = await fetch(`${getBaseUrl()}/agents/${agentId}/profile`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ bio: 'No auth' }),
      });
      expect(res.status).toBe(401);
    });

    it('agent cannot view another agent\'s profile page', async () => {
      const res = await getProfilePage(agent2.handle, apiKey);
      expect(res.status).toBe(403);
    });

    it('admin can view any profile page', async () => {
      const res = await getProfilePage(agent1Handle, getAdminKey());
      expect(res.status).toBe(200);
      expect(res.body).toContain(agent1Handle);
    });
  });

  describe('Suite 4: HTML profile page with market participation', () => {
    it('agent expresses opinion and views own profile page', async () => {
      const deadline = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
      const market = await createMarket({
        question: `Profile test market ${ts}`,
        description: 'A market for testing agent profiles',
        context: { articles: [], data_points: [], links: [] },
        category: 'pure_opinion',
        deadline,
      });
      expect(market.status).toBe(201);
      createdMarketIds.push(market.body.id);

      const expr = await expressOpinion(market.body.id, apiKey, 'yes');
      expect(expr.status).toBe(201);

      const ownPage = await getProfilePage(agent1Handle, apiKey);
      expect(ownPage.status).toBe(200);
      expect(ownPage.body).toContain('Updated bio only');
      expect(ownPage.body).toContain('Test Agent');
      expect(ownPage.body).toContain(agent1Handle);
      expect(ownPage.body).toContain('Agent Profile');
    });
  });

  describe('Suite 5: Multi-agent flow', () => {
    const agents: any[] = [];
    const bios = ['Alpha analyst bot', 'Beta reasoning engine', 'Gamma data cruncher'];
    const descriptions = ['Alpha Agent', 'Beta Agent', 'Gamma Agent'];

    it('registers and profiles 3 agents', async () => {
      for (let i = 0; i < 3; i++) {
        const a = await registerAgent(`multi-profile-${i}-${ts}`);
        expect(a.status).toBe(201);

        const up = await updateProfile(a.body.agent_id, a.body.api_key, {
          bio: bios[i],
          description: descriptions[i],
        });
        expect(up.status).toBe(200);

        agents.push(a.body);
        createdAgentIds.push(a.body.agent_id);
      }
    });

    it('each agent expresses on a shared market', async () => {
      const deadline = new Date(Date.now() + 3 * 60 * 60 * 1000).toISOString();
      const market = await createMarket({
        question: `Multi-agent test market ${ts}`,
        description: 'Testing multi-agent profiles',
        context: { articles: [], data_points: [], links: [] },
        category: 'pure_opinion',
        deadline,
      });
      createdMarketIds.push(market.body.id);

      const answers = ['yes', 'no', 'yes'];
      for (let i = 0; i < 3; i++) {
        const e = await expressOpinion(market.body.id, agents[i].api_key, answers[i]);
        expect(e.status).toBe(201);
      }
    });

    it('admin sees distinct profile data for each agent', async () => {
      for (let i = 0; i < 3; i++) {
        const page = await getProfilePage(agents[i].handle, getAdminKey());
        expect(page.status).toBe(200);
        expect(page.body).toContain(bios[i]);
        expect(page.body).toContain(descriptions[i]);
      }
    });
  });

  describe('Suite 6: Edge cases', () => {
    it('returns 404 for nonexistent handle', async () => {
      const res = await getProfilePage('nonexistent-handle-xyz', getAdminKey());
      expect(res.status).toBe(404);
    });
  });

  describe('Suite 7: Profile enhancements', () => {
    it('participation rate is <= 100%', async () => {
      const stats = await getProfile(agentId, apiKey);
      expect(stats.status).toBe(200);
      expect(stats.body.participation_rate).toBeLessThanOrEqual(1);
    });

    it('profile HTML page has expected sections and JS', async () => {
      const page = await getProfilePage(agent1Handle, apiKey);
      expect(page.status).toBe(200);
      expect(page.body).toContain('Points History');
      expect(page.body).toContain('Opinion History');
      expect(page.body).toContain('loadHistory');
      expect(page.body).toContain('loadPointsChart');
      expect(page.body).toContain('Participation Rate');
      expect(page.body).toContain('Total Opinions');
    });

    it('admin can access agent history endpoint', async () => {
      const res = await get(`/agents/${agentId}/history?page=1&limit=5`, getAdminKey());
      expect(res.status).toBe(200);
      expect(Array.isArray(res.body.history)).toBe(true);
    });

    it('admin can access agent balance endpoint', async () => {
      const res = await get(`/agents/${agentId}/balance`, getAdminKey());
      expect(res.status).toBe(200);
      expect(res.body.points_balance).toBeTypeOf('number');
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
});
