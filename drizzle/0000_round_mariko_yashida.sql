CREATE TABLE `adoptions` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`organization_id` integer NOT NULL,
	`hotspot_id` integer NOT NULL,
	`status` text DEFAULT 'Under Investigation' NOT NULL,
	`adopted_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`organization_id`) REFERENCES `organizations`(`id`) ON UPDATE no action ON DELETE no action,
	FOREIGN KEY (`hotspot_id`) REFERENCES `hotspots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_adoptions_hotspot` ON `adoptions` (`hotspot_id`);--> statement-breakpoint
CREATE INDEX `idx_adoptions_organization` ON `adoptions` (`organization_id`);--> statement-breakpoint
CREATE TABLE `complaints` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`tracking_code` text NOT NULL,
	`description` text NOT NULL,
	`location` text NOT NULL,
	`latitude` real,
	`longitude` real,
	`category` text NOT NULL,
	`subcategory` text NOT NULL,
	`severity` real NOT NULL,
	`confidence` real NOT NULL,
	`status` text DEFAULT 'Reported' NOT NULL,
	`hotspot_id` integer,
	`evidence_key` text,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	FOREIGN KEY (`hotspot_id`) REFERENCES `hotspots`(`id`) ON UPDATE no action ON DELETE no action
);
--> statement-breakpoint
CREATE UNIQUE INDEX `complaints_tracking_code_unique` ON `complaints` (`tracking_code`);--> statement-breakpoint
CREATE INDEX `idx_complaints_hotspot_id` ON `complaints` (`hotspot_id`);--> statement-breakpoint
CREATE INDEX `idx_complaints_category_location` ON `complaints` (`category`,`location`);--> statement-breakpoint
CREATE INDEX `idx_complaints_created_at` ON `complaints` (`created_at`);--> statement-breakpoint
CREATE INDEX `idx_complaints_status` ON `complaints` (`status`);--> statement-breakpoint
CREATE TABLE `hotspots` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`area` text NOT NULL,
	`category` text NOT NULL,
	`issue` text NOT NULL,
	`priority` real DEFAULT 1 NOT NULL,
	`report_count` integer DEFAULT 0 NOT NULL,
	`growth` integer DEFAULT 0 NOT NULL,
	`status` text DEFAULT 'Reported' NOT NULL,
	`radius` text DEFAULT '0.3 km' NOT NULL,
	`position_left` integer DEFAULT 50 NOT NULL,
	`position_top` integer DEFAULT 50 NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `idx_hotspots_area_category` ON `hotspots` (`area`,`category`);--> statement-breakpoint
CREATE INDEX `idx_hotspots_priority` ON `hotspots` (`priority`);--> statement-breakpoint
CREATE INDEX `idx_hotspots_status` ON `hotspots` (`status`);--> statement-breakpoint
CREATE TABLE `organizations` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`name` text NOT NULL,
	`expertise` text NOT NULL,
	`operating_region` text NOT NULL,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);--> statement-breakpoint
PRAGMA optimize;
