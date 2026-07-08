/**
 * Shared test helpers for Thought API integration tests.
 *
 * All helpers read TEST_API_URL and ADMIN_API_KEY from environment variables
 * so the same tests work against localhost and live Railway deployments.
 */
import Database from 'better-sqlite3';
import { drizzle, type BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';

/**
 * In-memory test DB fixture. The repo has accumulated migration drift (some
 * migrations reference tables/columns added by later migrations or repair
 * blocks in src/index.ts), so `drizzle migrate` against the migration files
 * does NOT produce the same schema as production.
 *
 * Pragmatic alternative: hand-roll CREATE TABLE statements for the tables a
 * test fixture needs, matching the final shape from src/db/schema.ts. Keep
 * this list in sync when schema changes touch these tables. For other tables,
 * add them here as new tests need them.
 */
const FIXTURE_SCHEMA = `
CREATE TABLE agents (
  id TEXT PRIMARY KEY,
  handle TEXT NOT NULL UNIQUE,
  api_key_hash TEXT NOT NULL,
  points_balance INTEGER NOT NULL DEFAULT 0,
  created_at TEXT NOT NULL,
  bio TEXT,
  avatar_url TEXT,
  description TEXT,
  is_active INTEGER NOT NULL DEFAULT 1,
  expires_at TEXT,
  agent_type TEXT,
  custom_instructions TEXT,
  custom_objective TEXT,
  location_country TEXT,
  location_region TEXT,
  location_city TEXT,
  consent_version TEXT,
  consented_at TEXT,
  retention_days INTEGER,
  deletion_requested_at TEXT,
  email TEXT
);
CREATE TABLE opinions (
  id TEXT PRIMARY KEY,
  market_id TEXT NOT NULL,
  agent_id TEXT NOT NULL,
  answer TEXT NOT NULL,
  basis TEXT,
  provenance_json TEXT,
  provenance_score REAL,
  confidence INTEGER,
  created_at TEXT NOT NULL,
  review_state TEXT,
  redacted_answer TEXT,
  reviewer_id TEXT,
  reviewed_at TEXT,
  pii_findings_json TEXT
);
CREATE TABLE point_transactions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  market_id TEXT,
  amount INTEGER NOT NULL,
  reason TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE profile_answers (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  question_key TEXT NOT NULL,
  answer TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE agent_classifications (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  classification_key TEXT NOT NULL,
  value TEXT NOT NULL,
  confidence REAL,
  computed_at TEXT NOT NULL
);
CREATE TABLE consent_records (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  consent_version TEXT NOT NULL,
  accepted_at TEXT NOT NULL,
  ip_hash TEXT,
  user_agent TEXT
);
CREATE TABLE pending_deletions (
  id TEXT PRIMARY KEY,
  agent_id TEXT NOT NULL,
  expires_at TEXT NOT NULL,
  created_at TEXT NOT NULL
);
CREATE TABLE markets (
  id TEXT PRIMARY KEY,
  question TEXT NOT NULL,
  description TEXT NOT NULL,
  context_json TEXT NOT NULL,
  category TEXT NOT NULL,
  status TEXT NOT NULL DEFAULT 'open',
  created_by TEXT NOT NULL,
  deadline TEXT NOT NULL,
  majority_position TEXT,
  created_at TEXT NOT NULL,
  funded_amount INTEGER,
  platform_fee INTEGER,
  reward_pool INTEGER,
  reward_distributed INTEGER DEFAULT 0,
  answer_options TEXT,
  answer_type TEXT NOT NULL DEFAULT 'binary',
  response_constraints TEXT,
  knowledge_source TEXT NOT NULL DEFAULT 'any',
  max_participants INTEGER,
  tags TEXT,
  scheduled_start TEXT,
  session_id TEXT,
  session_order INTEGER,
  creator_type TEXT,
  research_theme TEXT
);
`;

export function createTestDb(): {
  db: BetterSQLite3Database;
  sqlite: Database.Database;
  close: () => void;
} {
  const sqlite = new Database(':memory:');
  sqlite.exec(FIXTURE_SCHEMA);
  const db = drizzle(sqlite);
  return { db, sqlite, close: () => sqlite.close() };
}

export function getBaseUrl(): string {
  return process.env.TEST_API_URL || `http://localhost:${process.env.THOUGHT_PORT || '3001'}`;
}

export function getAdminKey(): string {
  return process.env.ADMIN_API_KEY || 'local-admin-key';
}

// ── Generic request helpers ──

export async function post(path: string, body: object, auth?: string) {
  const headers: Record<string, string> = { 'Content-Type': 'application/json' };
  if (auth) headers['Authorization'] = `Bearer ${auth}`;
  const res = await fetch(`${getBaseUrl()}${path}`, { method: 'POST', headers, body: JSON.stringify(body) });
  return { status: res.status, body: await res.json() as any };
}

export async function get(path: string, auth?: string) {
  const headers: Record<string, string> = {};
  if (auth) headers['Authorization'] = `Bearer ${auth}`;
  const res = await fetch(`${getBaseUrl()}${path}`, { headers });
  return { status: res.status, body: await res.json() as any };
}

// ── Agent helpers ──

export async function registerAgent(handle: string) {
  const reg = await post('/agents/register', { handle });
  // The profile gate (src/middleware/profileGate.ts) blocks market
  // participation until all required genesis questions are answered, so a
  // freshly-registered test agent completes its profile with stub answers.
  if (reg.status === 201 && reg.body?.api_key) {
    await completeProfile(reg.body.api_key);
  }
  return reg;
}

export async function completeProfile(apiKey: string) {
  const questions = await get('/agents/profile-questions');
  const list: Array<{ key: string; text: string }> = questions.body?.questions || [];
  const answers = list.map(q => ({
    question_key: q.key,
    answer: `Test answer for ${q.key}: a pragmatic, evidence-weighing stance sufficient for integration testing purposes.`,
  }));
  return post('/agents/profile', { answers }, apiKey);
}

export async function getBalance(agentId: string, apiKey: string) {
  return get(`/agents/${agentId}/balance`, apiKey);
}

// ── Market helpers ──

export async function createMarket(market: {
  question: string;
  description: string;
  context: object;
  category: string;
  deadline: string;
}) {
  return post('/admin/api/markets', market, getAdminKey());
}

export async function closeMarket(marketId: string) {
  return post(`/admin/api/markets/${marketId}/close`, {}, getAdminKey());
}

export async function getResults(marketId: string) {
  return get(`/markets/${marketId}/results`);
}

export async function deleteMarket(marketId: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getAdminKey()}`,
  };
  const res = await fetch(`${getBaseUrl()}/admin/api/markets/${marketId}`, { method: 'DELETE', headers });
  return { status: res.status, body: await res.json() as any };
}

export async function deleteAgent(agentId: string) {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${getAdminKey()}`,
  };
  const res = await fetch(`${getBaseUrl()}/admin/api/agents/${agentId}`, { method: 'DELETE', headers });
  return { status: res.status, body: await res.json() as any };
}

// ── Opinion helpers ──

export async function expressOpinion(
  marketId: string,
  apiKey: string,
  answer: string,
  provenance: object = { sources: [{ type: 'local', note: 'Local context' }], local_summary: 'Non-sensitive summary' },
) {
  return post(`/markets/${marketId}/express`, { answer, provenance }, apiKey);
}

// ── Profile helpers ──

export async function updateProfile(agentId: string, apiKey: string, data: object) {
  const res = await fetch(`${getBaseUrl()}/agents/${agentId}/profile`, {
    method: 'PUT',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${apiKey}`,
    },
    body: JSON.stringify(data),
  });
  return { status: res.status, body: await res.json() as any };
}

export async function getProfile(agentId: string, apiKey: string) {
  return get(`/agents/${agentId}/profile`, apiKey);
}

export async function getProfilePage(handle: string, apiKey: string) {
  const res = await fetch(`${getBaseUrl()}/profiles/${handle}`, {
    headers: { Authorization: `Bearer ${apiKey}` },
  });
  return { status: res.status, body: await res.text() };
}
