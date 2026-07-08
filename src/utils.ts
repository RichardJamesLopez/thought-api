import { sqlite } from './db/index.js';

export function safeJsonParse<T>(json: string, fallback: T): T {
  try {
    return JSON.parse(json);
  } catch {
    return fallback;
  }
}

export function getDefaultMarketFunding(): number {
  const rawEnv = process.env.DEFAULT_MARKET_FUNDING || process.env.SESSION_MARKET_REWARD || '100';
  const envParsed = parseInt(rawEnv, 10);
  const envFallback = Number.isFinite(envParsed) && envParsed > 0 ? envParsed : 100;

  try {
    const row = sqlite
      .prepare("SELECT value FROM app_settings WHERE key = 'default_market_funding'")
      .get() as { value?: string } | undefined;
    if (row?.value) {
      const parsed = parseInt(row.value, 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  } catch {
    return envFallback;
  }

  return envFallback;
}

export function getMaxAdminMarketFunding(): number {
  const rawEnv = process.env.MAX_ADMIN_MARKET_FUNDING || '500';
  const envParsed = parseInt(rawEnv, 10);
  const envFallback = Number.isFinite(envParsed) && envParsed > 0 ? envParsed : 500;

  try {
    const row = sqlite
      .prepare("SELECT value FROM app_settings WHERE key = 'max_admin_market_funding'")
      .get() as { value?: string } | undefined;
    if (row?.value) {
      const parsed = parseInt(row.value, 10);
      if (Number.isFinite(parsed) && parsed > 0) return parsed;
    }
  } catch {
    return envFallback;
  }

  return envFallback;
}
