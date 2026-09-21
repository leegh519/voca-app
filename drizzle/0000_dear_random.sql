CREATE TABLE `words` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`word` text NOT NULL,
	`word_key` text NOT NULL,
	`meaning` text NOT NULL,
	`note` text,
	`created_at` text DEFAULT '' NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `words_word_key_unique` ON `words` (`word_key`);