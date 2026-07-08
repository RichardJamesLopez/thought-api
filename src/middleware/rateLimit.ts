import { Context, Next } from 'hono';

interface RateLimitEntry {
  timestamps: number[];
}

const store = new Map<string, RateLimitEntry>();

// Clean up expired entries every 5 minutes
setInterval(() => {
  const now = Date.now();
  for (const [key, entry] of store.entries()) {
    entry.timestamps = entry.timestamps.filter(t => now - t < 3600000);
    if (entry.timestamps.length === 0) {
      store.delete(key);
    }
  }
}, 5 * 60 * 1000);

function createRateLimiter(limitEnvVar: string, defaultLimit: number) {
  return async (c: Context, next: Next) => {
    const limit = parseInt(process.env[limitEnvVar] || String(defaultLimit));
    const agent = c.get('agent') as { id: string } | undefined;
    const key = agent?.id || c.req.header('x-forwarded-for') || 'anonymous';

    const now = Date.now();
    const windowMs = 3600000; // 1 hour

    if (!store.has(key)) {
      store.set(key, { timestamps: [] });
    }

    const entry = store.get(key)!;
    entry.timestamps = entry.timestamps.filter(t => now - t < windowMs);

    if (entry.timestamps.length >= limit) {
      const oldestInWindow = Math.min(...entry.timestamps);
      const retryAfter = Math.ceil((oldestInWindow + windowMs - now) / 1000);
      c.header('Retry-After', String(retryAfter));
      return c.json({ error: 'Too Many Requests', retry_after: retryAfter }, 429);
    }

    entry.timestamps.push(now);
    return next();
  };
}

export const generalRateLimit = createRateLimiter('RATE_LIMIT_GENERAL', 1000);
export const opinionRateLimit = createRateLimiter('RATE_LIMIT_OPINIONS', 100);
export const makerRateLimit = createRateLimiter('RATE_LIMIT_MAKER', 100);
