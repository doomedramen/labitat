ALTER TABLE `widget_cache` ADD `configuration_revision` integer;--> statement-breakpoint
ALTER TABLE `widget_cache` ADD `last_attempt_at` integer;--> statement-breakpoint
ALTER TABLE `widget_cache` ADD `last_success_at` integer;--> statement-breakpoint
ALTER TABLE `widget_cache` ADD `freshness` text DEFAULT 'unknown';