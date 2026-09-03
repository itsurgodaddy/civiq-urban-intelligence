DROP INDEX `idx_hotspots_area_category`;--> statement-breakpoint
ALTER TABLE `hotspots` ADD `h3_cell` text;--> statement-breakpoint
ALTER TABLE `hotspots` ADD `latitude` real;--> statement-breakpoint
ALTER TABLE `hotspots` ADD `longitude` real;--> statement-breakpoint
CREATE INDEX `idx_hotspots_h3_category` ON `hotspots` (`h3_cell`,`category`);--> statement-breakpoint
CREATE INDEX `idx_hotspots_area_category` ON `hotspots` (`area`,`category`);--> statement-breakpoint
ALTER TABLE `complaints` ADD `h3_cell` text;--> statement-breakpoint
CREATE INDEX `idx_complaints_h3_category` ON `complaints` (`h3_cell`,`category`);