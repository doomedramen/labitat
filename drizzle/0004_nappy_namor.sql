CREATE TABLE `widget_cache` (
	`item_id` text PRIMARY KEY NOT NULL,
	`widget_data` text,
	`ping_status` text,
	`updated_at` text DEFAULT (current_timestamp)
);
