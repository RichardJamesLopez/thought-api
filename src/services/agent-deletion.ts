/**
 * Hard-delete cascade for an agent. Shared by admin DELETE /admin/api/agents/:id
 * and self-serve POST /agents/me/delete-confirm.
 *
 * Removes opinion history, point transactions, profile answers, classifications,
 * and pending-deletion tokens. Markets the agent created have their created_by
 * set to 'deleted' (markets themselves are kept so resolved-market history remains
 * intact for other participants).
 *
 * Consent records are anonymized rather than deleted: ip_hash and user_agent are
 * dropped, but the consent_version + accepted_at are kept as proof-of-consent
 * audit, satisfying GDPR while removing identifiers.
 */
import { eq } from 'drizzle-orm';
import { db, sqlite } from '../db/index.js';
import {
  agents,
  agentClassifications,
  consentRecords,
  markets,
  opinions,
  pendingDeletions,
  pointTransactions,
  profileAnswers,
} from '../db/schema.js';

/**
 * Atomic delete cascade. All 8 statements run inside a single SQLite
 * transaction so a partial failure (FK violation, lock contention, drive
 * full) rolls back every preceding statement — the user never ends up with
 * a half-deleted agent.
 *
 *   ┌────────────────────────────── sqlite.transaction ──────────────────────────────┐
 *   │ DELETE opinions ─► DELETE point_transactions ─► DELETE profile_answers ─►       │
 *   │ DELETE agent_classifications ─► DELETE pending_deletions ─►                     │
 *   │ UPDATE consent_records (anonymize ip_hash + user_agent) ─►                      │
 *   │ UPDATE markets (created_by = 'deleted') ─► DELETE agents                        │
 *   └────────────────────────────────────────────────────────────────────────────────┘
 *
 * better-sqlite3 transactions are synchronous; the outer function stays async
 * so existing `await deleteAgentCascade(id)` callers compile unchanged.
 */
export async function deleteAgentCascade(agentId: string): Promise<{ id: string; handle: string }> {
  const results = await db
    .select({ id: agents.id, handle: agents.handle })
    .from(agents)
    .where(eq(agents.id, agentId));
  if (results.length === 0) throw new Error('Agent not found');
  const agent = results[0];

  const runCascade = sqlite.transaction(() => {
    // Awaits below are no-ops at runtime — drizzle-orm/better-sqlite3 returns
    // synchronously. They stay for readability and consistency with the rest
    // of the codebase. If the transaction throws partway through, none of
    // these statements are committed.
    db.delete(opinions).where(eq(opinions.agent_id, agentId)).run();
    db.delete(pointTransactions).where(eq(pointTransactions.agent_id, agentId)).run();
    db.delete(profileAnswers).where(eq(profileAnswers.agent_id, agentId)).run();
    db.delete(agentClassifications).where(eq(agentClassifications.agent_id, agentId)).run();
    db.delete(pendingDeletions).where(eq(pendingDeletions.agent_id, agentId)).run();
    // Anonymize consent audit trail (keep version + timestamp, drop identifiers).
    db
      .update(consentRecords)
      .set({ ip_hash: null, user_agent: null })
      .where(eq(consentRecords.agent_id, agentId))
      .run();
    db.update(markets).set({ created_by: 'deleted' }).where(eq(markets.created_by, agentId)).run();
    db.delete(agents).where(eq(agents.id, agentId)).run();
  });
  runCascade();

  return agent;
}
