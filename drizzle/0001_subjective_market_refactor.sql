ALTER TABLE `predictions` RENAME TO `opinions`;--> statement-breakpoint
ALTER TABLE `markets` RENAME COLUMN `resolved_answer` TO `majority_position`;
