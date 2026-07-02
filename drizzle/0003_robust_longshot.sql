CREATE TABLE `IntakeLead` (
	`id` text PRIMARY KEY NOT NULL,
	`dialysisCenterId` text NOT NULL,
	`fullName` text NOT NULL,
	`myKadNumber` text NOT NULL,
	`homeAddress` text NOT NULL,
	`preferredDate` integer NOT NULL,
	`preferredSession` text NOT NULL,
	`phoneNumber` text NOT NULL,
	`labResultUrl` text,
	`labResultS3Key` text,
	`labResultOriginalName` text,
	`additionalNotes` text,
	`consentAt` integer NOT NULL,
	`ipAddress` text,
	`userAgent` text,
	`whatsappHandoffUrl` text NOT NULL,
	`picNotificationStatus` text DEFAULT 'pending' NOT NULL,
	`picNotificationMessageId` text,
	`picNotificationError` text,
	`accessToken` text NOT NULL,
	`accessExpiresAt` integer NOT NULL,
	`viewedAt` integer,
	`createdAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`dialysisCenterId`) REFERENCES `DialysisCenter`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE UNIQUE INDEX `IntakeLead_accessToken_unique` ON `IntakeLead` (`accessToken`);--> statement-breakpoint
CREATE INDEX `IntakeLead_dialysisCenterId_idx` ON `IntakeLead` (`dialysisCenterId`);--> statement-breakpoint
CREATE INDEX `IntakeLead_createdAt_idx` ON `IntakeLead` (`createdAt`);--> statement-breakpoint
CREATE INDEX `IntakeLead_accessToken_idx` ON `IntakeLead` (`accessToken`);--> statement-breakpoint
ALTER TABLE `DialysisCenter` ADD `whatsappPicName` text;--> statement-breakpoint
ALTER TABLE `DialysisCenter` ADD `whatsappPicPhoneNumber` text;--> statement-breakpoint
ALTER TABLE `DialysisCenter` ADD `whatsappPicOptedInAt` integer;--> statement-breakpoint
ALTER TABLE `DialysisCenter` ADD `whatsappTemplateName` text;--> statement-breakpoint
ALTER TABLE `DialysisCenter` ADD `whatsappTemplateLanguageCode` text DEFAULT 'ms';