CREATE TABLE `synthesis_deliverables` (
	`id` text PRIMARY KEY NOT NULL,
	`market_id` text NOT NULL,
	`type` text NOT NULL,
	`title` text NOT NULL,
	`content` text NOT NULL,
	`model_used` text,
	`response_count` integer,
	`generated_at` text NOT NULL
);
--> statement-breakpoint
ALTER TABLE `markets` ADD `answer_type` text DEFAULT 'binary' NOT NULL;--> statement-breakpoint
ALTER TABLE `markets` ADD `response_constraints` text;