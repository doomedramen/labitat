CREATE TABLE `groups` (
	`id` text PRIMARY KEY NOT NULL,
	`name` text NOT NULL,
	`order` integer NOT NULL,
	`created_at` text DEFAULT (current_timestamp)
);
--> statement-breakpoint
CREATE TABLE `items` (
	`id` text PRIMARY KEY NOT NULL,
	`group_id` text NOT NULL,
	`label` text NOT NULL,
	`href` text,
	`icon_url` text,
	`service_type` text,
	`service_url` text,
	`api_key_enc` text,
	`config_enc` text,
	`order` integer NOT NULL,
	`polling_ms` integer DEFAULT 10000,
	`created_at` text DEFAULT (current_timestamp),
	FOREIGN KEY (`group_id`) REFERENCES `groups`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE TABLE `settings` (
	`key` text PRIMARY KEY NOT NULL,
	`value` text NOT NULL
);
