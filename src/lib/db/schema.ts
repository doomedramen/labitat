import { sqliteTable, text, integer, index } from "drizzle-orm/sqlite-core"
import { sql, relations } from "drizzle-orm"

// ── Users ─────────────────────────────────────────────────────────────────────

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: text("created_at").default(sql`(current_timestamp)`),
})

// ── Groups ────────────────────────────────────────────────────────────────────

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  createdAt: text("created_at").default(sql`(current_timestamp)`),
})

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
    order: integer("order").notNull(),
    pollingMs: integer("polling_ms").default(10000),
    cleanMode: integer("clean_mode", { mode: "boolean" }).default(false),
    /** Controls whether the card header shows the icon or the label */
    displayMode: text("display_mode").default("label"),
    /** Controls whether stat cards in widgets show icons or labels */
    statDisplayMode: text("stat_display_mode").default("label"),
    /** Custom order of stat cards within widget grids (JSON array of IDs) */
    statCardOrder: text("stat_card_order", { mode: "json" }),
    createdAt: text("created_at").default(sql`(current_timestamp)`),
  },
  (table) => [index("items_group_id_idx").on(table.groupId)]
)

// ── Settings ──────────────────────────────────────────────────────────────────

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
})

// ── Widget Cache ──────────────────────────────────────────────────────────────

export const widgetCache = sqliteTable("widget_cache", {
  itemId: text("item_id").primaryKey(),
  widgetData: text("widget_data", { mode: "json" }),
  pingStatus: text("ping_status", { mode: "json" }),
  updatedAt: text("updated_at").default(sql`(current_timestamp)`),
})

// ── Relations ─────────────────────────────────────────────────────────────────

export const groupsRelations = relations(groups, ({ many }) => ({
  items: many(items),
}))

export const itemsRelations = relations(items, ({ one }) => ({
  group: one(groups, { fields: [items.groupId], references: [groups.id] }),
}))
