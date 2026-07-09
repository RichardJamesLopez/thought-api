import { Context, Next } from 'hono';
import bcrypt from 'bcryptjs';
import { db } from '../db/index.js';
import { agents } from '../db/schema.js';
import { extractBearerToken, isAdminApiKey } from '../config/admin-auth.js';

export const authMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  const apiKey = extractBearerToken(authHeader);
  if (!apiKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  // Allow admin API key to pass through (handlers check isAdmin separately)
  if (isAdminApiKey(apiKey)) {
    c.set('agent', { id: '__admin__' });
    return next();
  }

  const allAgents = await db.select().from(agents);

  for (const agent of allAgents) {
    const match = await bcrypt.compare(apiKey, agent.api_key_hash);
    if (match) {
      if (agent.is_active === 0) {
        return c.json({ error: 'Agent deactivated' }, 403);
      }
      if (agent.expires_at && new Date(agent.expires_at).getTime() <= Date.now()) {
        return c.json({ error: 'Agent expired' }, 403);
      }
      c.set('agent', agent);
      return next();
    }
  }

  return c.json({ error: 'Unauthorized' }, 401);
};

export const adminAuthMiddleware = async (c: Context, next: Next) => {
  const authHeader = c.req.header('Authorization');
  const apiKey = extractBearerToken(authHeader);
  if (!apiKey) {
    return c.json({ error: 'Unauthorized' }, 401);
  }

  if (!isAdminApiKey(apiKey)) {
    return c.json({ error: 'Forbidden' }, 403);
  }

  return next();
};
