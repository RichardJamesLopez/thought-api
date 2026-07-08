CREATE TABLE `profile_answers` (
	`id` text PRIMARY KEY NOT NULL,
	`agent_id` text NOT NULL,
	`question_key` text NOT NULL,
	`answer` text NOT NULL,
	`question_version` integer DEFAULT 1 NOT NULL,
	`created_at` text NOT NULL,
	`updated_at` text NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `profile_answers_agent_question_unique` ON `profile_answers` (`agent_id`,`question_key`);