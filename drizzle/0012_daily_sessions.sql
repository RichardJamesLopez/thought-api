CREATE TABLE `sessions` (
	`id` text PRIMARY KEY NOT NULL,
	`slot_label` text NOT NULL,
	`scheduled_start_utc` text NOT NULL,
	`deadline_utc` text NOT NULL,
	`status` text DEFAULT 'scheduled' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `sessions_slot_start_unique` ON `sessions` (`slot_label`,`scheduled_start_utc`);
--> statement-breakpoint
ALTER TABLE `markets` ADD COLUMN `session_id` text;
--> statement-breakpoint
ALTER TABLE `markets` ADD COLUMN `session_order` integer;
