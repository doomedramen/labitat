CREATE TABLE `dashboard_state` (
	`id` integer PRIMARY KEY NOT NULL,
	`revision` integer DEFAULT 0 NOT NULL
);
--> statement-breakpoint
CREATE TABLE `health_history` (
	`id` integer PRIMARY KEY AUTOINCREMENT NOT NULL,
	`item_id` text NOT NULL,
	`configuration_revision` integer NOT NULL,
	`observed_at` integer NOT NULL,
	`state` text NOT NULL,
	`reason` text,
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `health_history_item_idx` ON `health_history` (`item_id`,`configuration_revision`,`observed_at`);--> statement-breakpoint
CREATE INDEX `health_history_age_idx` ON `health_history` (`observed_at`);--> statement-breakpoint
CREATE TABLE `metric_history` (
	`item_id` text NOT NULL,
	`configuration_revision` integer NOT NULL,
	`bucket_at` integer NOT NULL,
	`observed_at` integer NOT NULL,
	`values` text NOT NULL,
	PRIMARY KEY(`item_id`, `configuration_revision`, `bucket_at`),
	FOREIGN KEY (`item_id`) REFERENCES `items`(`id`) ON UPDATE no action ON DELETE cascade
);
--> statement-breakpoint
CREATE INDEX `metric_history_age_idx` ON `metric_history` (`bucket_at`);
--> statement-breakpoint
INSERT INTO dashboard_state(id, revision) VALUES(1, 0) ON CONFLICT DO NOTHING;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS layout_items_insert AFTER INSERT ON items BEGIN UPDATE dashboard_state SET revision = revision + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS layout_groups_insert AFTER INSERT ON groups BEGIN UPDATE dashboard_state SET revision = revision + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS layout_items_delete AFTER DELETE ON items BEGIN UPDATE dashboard_state SET revision = revision + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS layout_groups_delete AFTER DELETE ON groups BEGIN UPDATE dashboard_state SET revision = revision + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS layout_items_update AFTER UPDATE OF group_id, "order" ON items WHEN OLD.group_id != NEW.group_id OR OLD."order" != NEW."order" BEGIN UPDATE dashboard_state SET revision = revision + 1 WHERE id = 1; END;
--> statement-breakpoint
CREATE TRIGGER IF NOT EXISTS layout_groups_update AFTER UPDATE OF "order" ON groups WHEN OLD."order" != NEW."order" BEGIN UPDATE dashboard_state SET revision = revision + 1 WHERE id = 1; END;
