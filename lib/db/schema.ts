import { sqliteTable, text, integer } from "drizzle-orm/sqlite-core"
import { sql, relations } from "drizzle-orm"

export const users = sqliteTable("users", {
  id: text("id").primaryKey(),
  email: text("email").notNull().unique(),
  passwordHash: text("password_hash").notNull(),
  role: text("role").notNull().default("admin"),
  createdAt: text("created_at").default(sql`(current_timestamp)`),
})

export const groups = sqliteTable("groups", {
  id: text("id").primaryKey(),
  name: text("name").notNull(),
  order: integer("order").notNull(),
  createdAt: text("created_at").default(sql`(current_timestamp)`),
})

export const items = sqliteTable("items", {
  id: text("id").primaryKey(),
  groupId: text("group_id")
    .notNull()
    .references(() => groups.id, { onDelete: "cascade" }),
  label: text("label").notNull(),
  href: text("href"),
  iconUrl: text("icon_url"),
  serviceType: text("service_type"),
  serviceUrl: text("service_url"),
  apiKeyEnc: text("api_key_enc"),
  configEnc: text("config_enc"),
  order: integer("order").notNull(),
  pollingMs: integer("polling_ms").default(10000),
  cleanMode: integer("clean_mode", { mode: "boolean" }).default(false),
  createdAt: text("created_at").default(sql`(current_timestamp)`),
})

export const settings = sqliteTable("settings", {
  key: text("key").primaryKey(),
  value: text("value").notNull(),
})

export const groupsRelations = relations(groups, ({ many }) => ({
  items: many(items),
}))

export const itemsRelations = relations(items, ({ one }) => ({
  group: one(groups, { fields: [items.groupId], references: [groups.id] }),
}))
