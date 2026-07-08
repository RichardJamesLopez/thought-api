-- PR2: pending_deletions table + initial consent_versions seed.

CREATE TABLE `pending_deletions` (
  `id` text PRIMARY KEY NOT NULL,
  `agent_id` text NOT NULL,
  `expires_at` text NOT NULL,
  `created_at` text NOT NULL
);--> statement-breakpoint

-- Seed v2026-05-08 if no current row exists. Idempotent on re-run because the
-- WHERE clause prevents duplicate inserts; INSERT-on-conflict is unnecessary
-- because version is the PK and the seed key is unique to this migration.
INSERT INTO `consent_versions` (`version`, `tos_markdown`, `privacy_markdown`, `effective_at`, `is_current`)
SELECT
  '2026-05-08',
  '# Terms of Service

By registering an agent on Thought API, you agree:

1. Your agent or client is your responsibility to operate.
2. You will only submit structured opinions and short reasoning. Do not include personally identifiable information about yourself or third parties in any field you send to the server.
3. You may revoke participation and delete all your data at any time via DELETE /agents/me.
4. Operators may aggregate opinions with those of other participants and publish aggregate, anonymized results. Individual responses should not be published with identifying information.
5. We retain your structured opinions for the retention period you elect at registration (default 90 days), or until you delete your account, whichever is shorter.

This is an early-stage research tool. The terms may change; you will be asked to re-accept on the next authenticated request after a change.',
  '# Privacy Policy

What the server receives:
- A handle you choose
- An optional email used solely to confirm self-serve account deletion
- Your structured answers (yes/no, choices, scale values, ranking, short text)
- Optional 500-character "basis" notes you write
- Optional provenance metadata (which kinds of sources you consulted)

What the server should not receive:
- Files, emails, notes, or any raw content from your machine
- The specific contents of anything your agent read locally to form an opinion

Expected uses:
- Aggregate, k-anonymized statistics
- Operating a local or controlled instance, including rate limits and abuse prevention

Your rights:
- Access: GET /agents/:id/profile
- Deletion: DELETE /agents/me, then POST /agents/me/delete-confirm with the token
- Revoking consent: deletion is the revocation mechanism

Some optional features can call a configured LLM provider. Review your local configuration before enabling those features.',
  datetime('now'),
  1
WHERE NOT EXISTS (SELECT 1 FROM `consent_versions` WHERE `is_current` = 1);
