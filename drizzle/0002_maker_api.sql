ALTER TABLE `markets` ADD COLUMN `funded_amount` integer;--> statement-breakpoint
ALTER TABLE `markets` ADD COLUMN `platform_fee` integer;--> statement-breakpoint
ALTER TABLE `markets` ADD COLUMN `reward_pool` integer;--> statement-breakpoint
ALTER TABLE `markets` ADD COLUMN `reward_distributed` integer DEFAULT 0;--> statement-breakpoint
ALTER TABLE `markets` ADD COLUMN `answer_options` text;
