CREATE TABLE `site_users` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`auth_user_id` text NOT NULL,
	`email` text NOT NULL,
	`display_name` text NOT NULL,
	`role` text DEFAULT 'citizen' NOT NULL,
	`organization_id` integer,
	`created_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL,
	`updated_at` text DEFAULT CURRENT_TIMESTAMP NOT NULL
);
--> statement-breakpoint
CREATE UNIQUE INDEX `site_users_auth_user_id_unique` ON `site_users` (`auth_user_id`);--> statement-breakpoint
CREATE INDEX `idx_site_users_role` ON `site_users` (`role`);--> statement-breakpoint
CREATE INDEX `idx_site_users_organization` ON `site_users` (`organization_id`);--> statement-breakpoint
ALTER TABLE `adoptions` ADD `adopted_by_auth_user_id` text;--> statement-breakpoint
ALTER TABLE `complaints` ADD `reporter_auth_user_id` text;--> statement-breakpoint
CREATE INDEX `idx_complaints_reporter` ON `complaints` (`reporter_auth_user_id`);--> statement-breakpoint
ALTER TABLE `organizations` ADD `owner_auth_user_id` text;--> statement-breakpoint
ALTER TABLE `organizations` ADD `contact_email` text;--> statement-breakpoint
ALTER TABLE `organizations` ADD `verification_status` text DEFAULT 'pending' NOT NULL;--> statement-breakpoint
ALTER TABLE `organizations` ADD `updated_at` text DEFAULT '' NOT NULL;--> statement-breakpoint
UPDATE `organizations` SET `updated_at` = CURRENT_TIMESTAMP WHERE `updated_at` = '';--> statement-breakpoint
CREATE UNIQUE INDEX `idx_organizations_owner` ON `organizations` (`owner_auth_user_id`);--> statement-breakpoint
CREATE INDEX `idx_organizations_verification` ON `organizations` (`verification_status`);
