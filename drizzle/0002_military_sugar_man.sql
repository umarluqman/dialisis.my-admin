CREATE TABLE `CenterOperatingHour` (
	`id` text PRIMARY KEY NOT NULL,
	`dayOfWeek` integer NOT NULL,
	`openTime` text NOT NULL,
	`closeTime` text NOT NULL,
	`isClosed` integer DEFAULT false NOT NULL,
	`dialysisCenterId` text NOT NULL,
	`createdAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updatedAt` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`dialysisCenterId`) REFERENCES `DialysisCenter`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `centerOperatingHour_dialysisCenterId_idx` ON `CenterOperatingHour` (`dialysisCenterId`);--> statement-breakpoint
CREATE INDEX `centerOperatingHour_dayOfWeek_idx` ON `CenterOperatingHour` (`dayOfWeek`);