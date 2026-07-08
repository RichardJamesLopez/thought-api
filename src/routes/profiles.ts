import { Hono } from 'hono';
import { getCookie } from 'hono/cookie';
import { db } from '../db/index.js';
import { agents, profileAnswers } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { profileQuestions } from '../db/profile-questions.js';
import bcrypt from 'bcryptjs';
import { computeAgentStats } from '../services/agent-stats.js';
import { renderAgentProfile } from '../views/agent-profile.js';

export const profilePageRoutes = new Hono();

// GET /profiles/:handle — authenticated profile page (owner or admin)
// Supports: Bearer token (API) OR thought_admin_session cookie (browser)
profilePageRoutes.get('/:handle', async (c) => {
  const handle = c.req.param('handle')!;
  const adminKey = process.env.ADMIN_API_KEY || 'local-admin-key';

  // Determine auth: Bearer token or admin session cookie
  let bearerToken: string | null = null;
  let isAdmin = false;

  const authHeader = c.req.header('Authorization') || '';
  if (authHeader.startsWith('Bearer ')) {
    bearerToken = authHeader.slice(7);
    isAdmin = bearerToken === adminKey;
  }

  // Fall back to admin session cookie (for browser access from dashboard)
  if (!bearerToken) {
    const sessionCookie = getCookie(c, 'thought_admin_session');
    if (sessionCookie && sessionCookie === adminKey) {
      isAdmin = true;
    }
  }

  if (!bearerToken && !isAdmin) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Find the profile agent by handle
  const agentRows = await db.select().from(agents).where(eq(agents.handle, handle));
  if (agentRows.length === 0) {
    return c.html(`<!DOCTYPE html><html><head><title>Not Found</title></head><body><h1>Agent not found</h1></body></html>`, 404);
  }
  const profileAgent = agentRows[0];

  // If not admin, verify the bearer token belongs to the profile owner
  let isOwner = false;
  if (isAdmin) {
    isOwner = false; // admin viewing, not the owner
  } else {
    const match = await bcrypt.compare(bearerToken!, profileAgent.api_key_hash);
    if (!match) {
      return c.json({ error: 'Forbidden: you can only view your own profile' }, 403);
    }
    isOwner = true;
  }

  const stats = await computeAgentStats(profileAgent.id);
  if (!stats) {
    return c.html(`<!DOCTYPE html><html><head><title>Not Found</title></head><body><h1>Agent not found</h1></body></html>`, 404);
  }

  // Fetch genesis profile answers
  const answerRows = await db.select().from(profileAnswers).where(eq(profileAnswers.agent_id, profileAgent.id));
  const answerMap = new Map(answerRows.map(a => [a.question_key, a.answer]));
  const labelMap: Record<string, string> = {
    agent_type: 'Agent Type',
    primary_domain: 'Primary Domain',
    reasoning_approach: 'Reasoning Approach',
    knowledge_recency: 'Knowledge Recency',
    subject_familiarity: 'Subject Familiarity',
    self_description: 'Self Description',
  };
  const genesisAnswers = profileQuestions
    .filter(q => q.phase === 'genesis' && answerMap.has(q.key))
    .map(q => ({ key: q.key, label: labelMap[q.key] || q.key, answer: answerMap.get(q.key)! }));

  return c.html(renderAgentProfile({
    ...stats,
    is_owner: isOwner,
    api_key: isOwner ? bearerToken! : isAdmin ? adminKey : undefined,
    genesis_answers: genesisAnswers,
  }));
});
