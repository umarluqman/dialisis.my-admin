CREATE TABLE `CenterFaq` (
	`id` text PRIMARY KEY NOT NULL,
	`question` text NOT NULL,
	`answer` text NOT NULL,
	`displayOrder` integer DEFAULT 0 NOT NULL,
	`isActive` integer DEFAULT true NOT NULL,
	`dialysisCenterId` text NOT NULL,
	`createdAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`dialysisCenterId`) REFERENCES `DialysisCenter`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `centerFaq_dialysisCenterId_idx` ON `CenterFaq` (`dialysisCenterId`);--> statement-breakpoint
CREATE INDEX `centerFaq_displayOrder_idx` ON `CenterFaq` (`displayOrder`);--> statement-breakpoint
CREATE INDEX `centerFaq_isActive_idx` ON `CenterFaq` (`isActive`);--> statement-breakpoint
CREATE TABLE `invitation` (
	`id` text PRIMARY KEY NOT NULL,
	`token` text NOT NULL,
	`center_ids` text NOT NULL,
	`expires_at` integer NOT NULL,
	`used` integer DEFAULT false NOT NULL,
	`used_by` text,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`used_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `invitation_token_unique` ON `invitation` (`token`);--> statement-breakpoint
CREATE INDEX `invitation_token_idx` ON `invitation` (`token`);--> statement-breakpoint
CREATE INDEX `invitation_createdBy_idx` ON `invitation` (`created_by`);