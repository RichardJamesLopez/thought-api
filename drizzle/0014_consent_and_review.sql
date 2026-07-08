-- Consent layer, longform review queue, and optional agent tagging.
-- All ALTERs are nullable adds (no default rewrites, no table locks).

ALTER TABLE `agents` ADD `consent_version` text;--> statement-breakpoint
ALTER TABLE `agents` ADD `consented_at` text;--> statement-breakpoint
ALTER TABLE `agents` ADD `retention_days` integer;--> statement-breakpoint
ALTER TABLE `agents` ADD `deletion_requested_at` text;--> statement-breakpoint
ALTER TABLE `agents` ADD `email` text;--> statement-breakpoint
ALTER TABLE `agents` ADD `agent_type` text;--> statement-breakpoint

ALTER TABLE `opinions` ADD `review_state` text;--> statement-breakpoint
ALTER TABLE `opinions` ADD `redacted_answer` text;--> statement-breakpoint
ALTER TABLE `opinions` ADD `reviewer_id` text;--> statement-breakpoint
ALTER TABLE `opinions` ADD `reviewed_at` text;--> statement-breakpoint
ALTER TABLE `opinions` ADD `pii_findings_json` text;--> statement-breakpoint

CREATE TABLE `consent_records` (
  `id` text PRIMARY KEY NOT NULL,
  `agent_id` text NOT NULL,
  `consent_version` text NOT NULL,
  `accepted_at` text NOT NULL,
  `ip_hash` text,
  `user_agent` text
);--> statement-breakpoint

CREATE TABLE `consent_versions` (
  `version` text PRIMARY KEY NOT NULL,
  `tos_markdown` text NOT NULL,
  `privacy_markdown` text NOT NULL,
  `effective_at` text NOT NULL,
  `is_current` integer DEFAULT 0 NOT NULL
);--> statement-breakpoint

-- Backfill existing untagged agents for cohort filters.
UPDATE `agents` SET `agent_type` = 'human' WHERE `agent_type` IS NULL;
