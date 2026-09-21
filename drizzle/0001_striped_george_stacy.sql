ALTER TABLE `words` ADD `correct_count` integer DEFAULT 0 NOT NULL;--> statement-breakpoint
ALTER TABLE `words` ADD `known` integer DEFAULT false NOT NULL;