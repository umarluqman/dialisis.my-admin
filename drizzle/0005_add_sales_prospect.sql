CREATE TABLE `sales_prospect` (
	`id` text PRIMARY KEY NOT NULL,
	`organization` text NOT NULL,
	`dialysis_center_id` text,
	`contact_name` text,
	`phone` text,
	`stage` text DEFAULT 'contacted' NOT NULL,
	`lost_reason` text,
	`notes` text,
	`next_follow_up_at` integer,
	`demo_at` integer,
	`pilot_at` integer,
	`paid_at` integer,
	`lost_at` integer,
	`created_by` text NOT NULL,
	`created_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	`updated_at` integer DEFAULT (cast(unixepoch('subsecond') * 1000 as integer)) NOT NULL,
	FOREIGN KEY (`dialysis_center_id`) REFERENCES `DialysisCenter`(`id`) ON UPDATE no action ON DELETE set null,
	FOREIGN KEY (`created_by`) REFERENCES `user`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE INDEX `salesProspect_stage_idx` ON `sales_prospect` (`stage`);--> statement-breakpoint
CREATE INDEX `salesProspect_dialysisCenterId_idx` ON `sales_prospect` (`dialysis_center_id`);