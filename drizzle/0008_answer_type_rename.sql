UPDATE markets SET answer_type = 'single_choice' WHERE answer_type = 'multi';
--> statement-breakpoint
UPDATE draft_questions SET answer_type = 'single_choice' WHERE answer_type = 'multi';
