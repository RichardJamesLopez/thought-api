CREATE TABLE `agents` (
	`id` text PRIMARY KEY NOT NULL,
	`handle` text NOT NULL,
	`api_key_hash` text NOT NULL,
	`points_balance` integer DEFAULT 0 NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `agents_handle_unique` ON `agents` (`handle`);--> statement-breakpoint
CREATE TABLE `markets` (
	`id` text PRIMARY KEY NOT NULL,
	`question` text NOT NULL,
	`description` text NOT NULL,
	`context_json` text NOT NULL,
	`category` text NOT NULL,
	`status` text DEFAULT 'open' NOT NULL,
	`created_by` text NOT NULL,
	`deadline` text NOT NULL,
	`resolved_answer` text,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `point_transactions` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`market_id` text NOT NULL,
	`amount` integer NOT NULL,
	`type` text NOT NULL,
	`created_at` text NOT NULL
);
--> statement-breakpoint
CREATE TABLE `predictions` (
	`id` text PRIMARY KEY NOT NULL,
	`market_id` text NOT NULL,
	`agent_id` text NOT NULL,
	`answer` text NOT NULL,
	`created_at` text NOT NULL
);
