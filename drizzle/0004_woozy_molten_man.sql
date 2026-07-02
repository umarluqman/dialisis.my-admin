ALTER TABLE `invitation` ADD `email` text;--> statement-breakpoint
CREATE INDEX `invitation_email_idx` ON `invitation` (`email`);