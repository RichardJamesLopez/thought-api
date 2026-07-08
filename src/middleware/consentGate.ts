/**
 * Returns 426 Upgrade Required if the authed agent's accepted consent_version
 * is not the current one. Mounted on opinion-creating routes only (per A' plan,
 * read endpoints stay open during rollout to avoid disrupting existing consumers).
 *
 * Disable for staging by setting CONSENT_GATE_ENABLED=false.
 */
import { Context, Next } from 'hono';
import { eq } from 'drizzle-orm';
import { db } from '../db/index.js';
import { consentVersions } from '../db/schema.js';

let cachedCurrentVersion: string | null = null;
let cachedAt = 0;
const CACHE_TTL_MS = 30_000;

async function getCurrentConsentVersion(): Promise<string | null> {
  const now = Date.now();
  if (cachedCurrentVersion && now - cachedAt < CACHE_TTL_MS) {
    return cachedCurrentVersion;
  }
  const rows = await db
    .select({ version: consentVersions.version })
    .from(consentVersions)
    .where(eq(consentVersions.is_current, 1));
  cachedCurrentVersion = rows[0]?.version ?? null;
  cachedAt = now;
  return cachedCurrentVersion;
}

export function clearConsentVersionCache() {
  cachedCurrentVersion = null;
  cachedAt = 0;
}

export const consentGateMiddleware = async (c: Context, next: Next) => {
  if (process.env.CONSENT_GATE_ENABLED === 'false') {
    return next();
  }

  const agent = c.get('agent') as { id: string; consent_version?: string | null } | undefined;
  if (!agent) {
    return c.json({ error: 'Unauthorized' }, 401);
  }
  // Admin pass-through (auth middleware sets a synthetic agent for admin-key callers)
  if (agent.id === '__admin__') {
    return next();
  }

  const required = await getCurrentConsentVersion();
  if (!required) {
    // No consent version configured at all — fail closed in prod, open in dev
    if (process.env.NODE_ENV === 'production') {
      return c.json({ error: 'Server consent configuration missing' }, 503);
    }
    return next();
  }

  if (agent.consent_version === required) {
    return next();
  }

  return c.json(
    {
      error: 'Consent version out of date',
      required_consent_version: required,
      tos_url: '/terms',
      privacy_url: '/privacy',
      action: 'POST /agents/me/consent with { consent_version }',
    },
    426,
  );
};
