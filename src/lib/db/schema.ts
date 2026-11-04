import { sqliteTable, text, integer, index, primaryKey } from "drizzle-orm/sqlite-core";
import { sql, relations } from "drizzle-orm";

// ── Users ─────────────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: text("created_at").default(sql`(current_timestamp)`),
});

// ── Groups ────────────────────────────────────────────────────────────────────

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  createdAt: text("created_at").default(sql`(current_timestamp)`),
});

// ── Items ─────────────────────────────────────────────────────────────────────

export const items = sqliteTable(
  "items",
  {
    id: text("id").primaryKey(),
    groupId: text("group_id")
      .notNull()
      .references(() => groups.id, { onDelete: "cascade" }),
    label: text("label").notNull(),
    href: text("href"),
    iconUrl: text("icon_url"),
    serviceType: text("service_type"),
    serviceUrl: text("service_url"),
    configEnc: text("config_enc"),
    /** Non-secret generation for service configuration and endpoint changes. */
    configurationRevision: integer("configuration_revision").notNull().default(0),
    order: integer("order").notNull(),
    pollingMs: integer("polling_ms").default(10000),
    /** Controls whether the card header shows the icon or the label */
    displayMode: text("display_mode").default("label"),
    /** Controls whether stat cards in widgets show icons or labels */
    statDisplayMode: text("stat_display_mode").default("label"),
    /** Custom order of stat cards within widget grids (JSON array of IDs) */
    statCardOrder: text("stat_card_order"),
    createdAt: text("created_at").default(sql`(current_timestamp)`),
  },
  (table) => [index("items_group_id_idx").on(table.groupId)],
);

// ── Settings ──────────────────────────────────────────────────────────────────

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
});

// ── Widget Cache ──────────────────────────────────────────────────────────────

export const widgetCache = sqliteTable("widget_cache", {
  itemId: text("item_id").primaryKey(),
  widgetData: text("widget_data", { mode: "json" }),
  pingStatus: text("ping_status", { mode: "json" }),
  updatedAt: text("updated_at").default(sql`(current_timestamp)`),
  configurationRevision: integer("configuration_revision"),
  lastAttemptAt: integer("last_attempt_at"),
  lastSuccessAt: integer("last_success_at"),
  freshness: text("freshness").default("unknown"),
});

// ── Relations ─────────────────────────────────────────────────────────────────

export const groupsRelations = relations(groups, ({ many }) => ({
  items: many(items),
}));

export const itemsRelations = relations(items, ({ one }) => ({
  group: one(groups, { fields: [items.groupId], references: [groups.id] }),
}));

// History contains only selected numeric measurements, never complete adapter payloads.
export const metricHistory = sqliteTable(
  "metric_history",
  {
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    configurationRevision: integer("configuration_revision").notNull(),
    bucketAt: integer("bucket_at").notNull(),
    observedAt: integer("observed_at").notNull(),
    values: text("values", { mode: "json" })
      .$type<import("../history-types").HistoryValues>()
      .notNull(),
  },
  (table) => [
    primaryKey({ columns: [table.itemId, table.configurationRevision, table.bucketAt] }),
    index("metric_history_age_idx").on(table.bucketAt),
  ],
);
export const healthHistory = sqliteTable(
  "health_history",
  {
    id: integer("id").primaryKey({ autoIncrement: true }),
    itemId: text("item_id")
      .notNull()
      .references(() => items.id, { onDelete: "cascade" }),
    configurationRevision: integer("configuration_revision").notNull(),
    observedAt: integer("observed_at").notNull(),
    state: text("state").notNull(),
    reason: text("reason"),
  },
  (table) => [
    index("health_history_item_idx").on(
      table.itemId,
      table.configurationRevision,
      table.observedAt,
    ),
    index("health_history_age_idx").on(table.observedAt),
  ],
);
export const dashboardState = sqliteTable("dashboard_state", {
  id: integer("id").primaryKey(),
  revision: integer("revision").notNull().default(0),
});
