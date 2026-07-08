/**
 * Integration tests for deleteAgentCascade — verifies the cascade is atomic
 * (full success or full rollback) using an in-memory SQLite database with
 * the real migrations applied. Exercises createTestDb() from helpers.
 */
import { describe, it, expect, beforeEach, afterEach } from 'vitest';
import { eq } from 'drizzle-orm';
import { createTestDb } from './helpers';
import {
  agents,
  agentClassifications,
  consentRecords,
  markets,
  opinions,
  pendingDeletions,
  pointTransactions,
  profileAnswers,
} from '../src/db/schema';

function seedAgent(sqlite: any, agentId: string, handle: string) {
  const now = new Date().toISOString();
  sqlite.prepare(
    `INSERT INTO agents (id, handle, api_key_hash, points_balance, created_at, agent_type)
     VALUES (?, ?, ?, ?, ?, 'human')`,
  ).run(agentId, handle, 'hash', 0, now);
  sqlite.prepare(
    `INSERT INTO consent_records (id, agent_id, consent_version, accepted_at, ip_hash, user_agent)
     VALUES (?, ?, ?, ?, ?, ?)`,
  ).run('cr-' + agentId, agentId, '2026-05-08', now, 'hash-of-ip', 'Mozilla/5.0');
  sqlite.prepare(
    `INSERT INTO pending_deletions (id, agent_id, expires_at, created_at)
     VALUES (?, ?, ?, ?)`,
  ).run('pd-' + agentId, agentId, now, now);
  sqlite.prepare(
    `INSERT INTO markets (id, question, description, context_json, category, deadline, status, created_by, created_at, funded_amount, platform_fee, reward_pool, reward_distributed)
     VALUES (?, ?, ?, ?, ?, ?, 'open', ?, ?, 0, 0, 0, 0)`,
  ).run('m-' + agentId, 'q?', 'desc', '{}', 'general', now, agentId, now);
}

function counts(sqlite: any, agentId: string) {
  return {
    agents: (sqlite.prepare('SELECT count(*) AS c FROM agents WHERE id = ?').get(agentId) as any).c,
    consentRecords: (sqlite.prepare('SELECT count(*) AS c FROM consent_records WHERE agent_id = ?').get(agentId) as any).c,
    consentAnonymized: (sqlite.prepare("SELECT count(*) AS c FROM consent_records WHERE agent_id = ? AND ip_hash IS NULL AND user_agent IS NULL").get(agentId) as any).c,
    pendingDeletions: (sqlite.prepare('SELECT count(*) AS c FROM pending_deletions WHERE agent_id = ?').get(agentId) as any).c,
    marketsCreatedBy: (sqlite.prepare("SELECT count(*) AS c FROM markets WHERE created_by = ?").get(agentId) as any).c,
    marketsTombstoned: (sqlite.prepare("SELECT count(*) AS c FROM markets WHERE created_by = 'deleted'").get() as any).c,
  };
}

describe('deleteAgentCascade (atomic transaction)', () => {
  let testDb: ReturnType<typeof createTestDb>;
  const AGENT_ID = 'test-agent-a';
  const OTHER_AGENT_ID = 'test-agent-b';

  beforeEach(async () => {
    // The function-under-test imports db/sqlite singletons from src/db/index.
    // For these tests we hot-swap that module to point at the test DB before
    // the function reads from it. Doing it via vi.doMock + dynamic import
    // gives a fresh DB per test.
    testDb = createTestDb();
    seedAgent(testDb.sqlite, AGENT_ID, 'agent-a');
    seedAgent(testDb.sqlite, OTHER_AGENT_ID, 'agent-b');
  });

  afterEach(() => {
    testDb.close();
  });

  it('happy path: all 8 statements committed; agent and dependent rows gone', async () => {
    const { vi } = await import('vitest');
    vi.doMock('../src/db/index.js', () => ({ db: testDb.db, sqlite: testDb.sqlite }));
    const { deleteAgentCascade } = await import('../src/services/agent-deletion.js?happy');

    const before = counts(testDb.sqlite, AGENT_ID);
    expect(before.agents).toBe(1);
    expect(before.consentRecords).toBe(1);
    expect(before.consentAnonymized).toBe(0);
    expect(before.pendingDeletions).toBe(1);
    expect(before.marketsCreatedBy).toBe(1);

    const result = await deleteAgentCascade(AGENT_ID);
    expect(result).toEqual({ id: AGENT_ID, handle: 'agent-a' });

    const after = counts(testDb.sqlite, AGENT_ID);
    expect(after.agents).toBe(0);
    expect(after.consentRecords).toBe(1);          // record preserved as audit
    expect(after.consentAnonymized).toBe(1);       // but ip_hash + user_agent nulled
    expect(after.pendingDeletions).toBe(0);
    expect(after.marketsCreatedBy).toBe(0);        // no markets still attributed to agent
    expect(after.marketsTombstoned).toBe(1);       // markets tombstoned with 'deleted'

    // Other agent untouched
    const other = counts(testDb.sqlite, OTHER_AGENT_ID);
    expect(other.agents).toBe(1);
    expect(other.consentAnonymized).toBe(0);

    vi.doUnmock('../src/db/index.js');
  });

  it('partial failure rolls back: mid-cascade throw leaves all rows intact', async () => {
    const { vi } = await import('vitest');
    // Wrap sqlite.transaction so any throw inside aborts the transaction.
    // We simulate failure by injecting a poison FK constraint: insert a row
    // that references AGENT_ID in a table the cascade doesn't touch, then
    // make the cascade try to delete the agent row last — the FK fails.
    // Simpler: monkey-patch one of the db.delete chains to throw.
    const realDelete = testDb.db.delete.bind(testDb.db);
    let callCount = 0;
    const poisonedDb = {
      ...testDb.db,
      select: testDb.db.select.bind(testDb.db),
      delete: (...args: any[]) => {
        callCount++;
        // 4th delete call is agent_classifications — throw on that one.
        if (callCount === 4) {
          throw new Error('simulated mid-cascade failure');
        }
        return (realDelete as any)(...args);
      },
      update: testDb.db.update.bind(testDb.db),
    };

    vi.doMock('../src/db/index.js', () => ({ db: poisonedDb, sqlite: testDb.sqlite }));
    const { deleteAgentCascade } = await import('../src/services/agent-deletion.js?partial');

    const before = counts(testDb.sqlite, AGENT_ID);

    await expect(deleteAgentCascade(AGENT_ID)).rejects.toThrow('simulated mid-cascade failure');

    const after = counts(testDb.sqlite, AGENT_ID);
    expect(after).toEqual(before);                  // EVERYTHING rolled back
    expect(after.agents).toBe(1);
    expect(after.consentAnonymized).toBe(0);       // consent record NOT anonymized
    expect(after.pendingDeletions).toBe(1);
    expect(after.marketsCreatedBy).toBe(1);

    vi.doUnmock('../src/db/index.js');
  });

  it('non-existent agent throws before any writes', async () => {
    const { vi } = await import('vitest');
    vi.doMock('../src/db/index.js', () => ({ db: testDb.db, sqlite: testDb.sqlite }));
    const { deleteAgentCascade } = await import('../src/services/agent-deletion.js?notfound');

    const beforeOther = counts(testDb.sqlite, OTHER_AGENT_ID);

    await expect(deleteAgentCascade('nope')).rejects.toThrow('Agent not found');

    // Other agents are not affected
    const afterOther = counts(testDb.sqlite, OTHER_AGENT_ID);
    expect(afterOther).toEqual(beforeOther);

    vi.doUnmock('../src/db/index.js');
  });
});
