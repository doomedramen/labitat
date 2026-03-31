import type { groups, items } from "@/lib/db/schema"

export type GroupRow = typeof groups.$inferSelect
export type ItemRow = typeof items.$inferSelect
export type GroupWithItems = GroupRow & { items: ItemRow[] }
