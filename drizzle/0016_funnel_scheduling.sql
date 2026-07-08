-- Funnel-driven scheduling: extend research_funnels with target/pacing/mix columns,
-- and allow draft_questions to originate from funnels (longform pre-deploy review queue).

ALTER TABLE `research_funnels` ADD `target_resolved` integer NOT NULL DEFAULT 40;--> statement-breakpoint
ALTER TABLE `research_funnels` ADD `markets_per_session` integer NOT NULL DEFAULT 2;--> statement-breakpoint
ALTER TABLE `research_funnels` ADD `mix_binary` real NOT NULL DEFAULT 0.2;--> statement-breakpoint
ALTER TABLE `research_funnels` ADD `mix_single_choice` real NOT NULL DEFAULT 0.2;--> statement-breakpoint
ALTER TABLE `research_funnels` ADD `mix_multi_choice` real NOT NULL DEFAULT 0.2;--> statement-breakpoint
ALTER TABLE `research_funnels` ADD `mix_longform` real NOT NULL DEFAULT 0.4;--> statement-breakpoint
ALTER TABLE `markets` ADD `creator_type` text;--> statement-breakpoint
ALTER TABLE `markets` ADD `research_theme` text;--> statement-breakpoint

-- Rebuild draft_questions to make surface_topic_id nullable and add funnel_id.
-- SQLite doesn't support dropping NOT NULL in-place, so we recreate the table.
CREATE TABLE `draft_questions_new` (
  `id` text PRIMARY KEY NOT NULL,
  `surface_topic_id` text,
  `funnel_id` text,
  `question` text NOT NULL,
  `description` text NOT NULL,
  `category` text NOT NULL,
  `answer_type` text NOT NULL DEFAULT 'binary',
  `answer_options` text,
  `response_constraints` text,
  `context_json` text NOT NULL DEFAULT '{}',
  `status` text NOT NULL DEFAULT 'draft',
  `generation_round` integer NOT NULL DEFAULT 1,
  `created_at` text NOT NULL,
  `updated_at` text NOT NULL,
  CHECK ((surface_topic_id IS NULL) != (funnel_id IS NULL))
);--> statement-breakpoint

INSERT INTO `draft_questions_new` (
  id, surface_topic_id, funnel_id, question, description, category,
  answer_type, answer_options, response_constraints, context_json,
  status, generation_round, created_at, updated_at
) SELECT
  id, surface_topic_id, NULL, question, description, category,
  answer_type, answer_options, response_constraints, context_json,
  status, generation_round, created_at, updated_at
FROM `draft_questions`;--> statement-breakpoint

DROP TABLE `draft_questions`;--> statement-breakpoint
ALTER TABLE `draft_questions_new` RENAME TO `draft_questions`;--> statement-breakpoint

-- Backfill: Software Product Trends → 65 (explicit user requirement).
-- Other established funnels → max(40, resolved+5) so existing converging funnels
-- don't immediately re-trigger generation.
UPDATE `research_funnels` SET `target_resolved` = 65 WHERE `display_insight_name` = 'Software Product Trends';--> statement-breakpoint

UPDATE `research_funnels` SET `target_resolved` = MAX(
  40,
  (SELECT COUNT(*) + 5 FROM markets WHERE markets.research_theme = research_funnels.id AND markets.status = 'resolved')
) WHERE `display_insight_name` IN (
  'Inflation Perceptibility',
  'Fashion Trendsetter Identification',
  'Presidential Field Prediction'
);
