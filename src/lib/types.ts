import type { groups, items } from "@/lib/db/schema"
import type { ServiceData, ServiceStatus } from "@/lib/adapters/types"

export type GroupRow = typeof groups.$inferSelect
export type ItemRow = typeof items.$inferSelect
export type GroupWithItems = GroupRow & { items: ItemRow[] }

export type ItemWithCache = ItemRow & {
  cachedWidgetData: ServiceData | null
  cachedPingStatus: ServiceStatus | null
}
export type GroupWithCache = GroupRow & { items: ItemWithCache[] }

/** Controls whether the item card header shows an icon or a label */
export type ItemCardDisplayMode = "icon" | "label"

/** Controls whether stat cards in widgets show icons or labels */
export type StatDisplayMode = "icon" | "label"
