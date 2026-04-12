import { getCachedAny, setCached } from "./cache"
import type { ServiceData, ServiceStatus } from "./adapters/types"

export interface ItemDatapoint {
  widgetData: ServiceData | null
  pingStatus: ServiceStatus | null
  timestamp: number
}

const WIDGET_KEY = (itemId: string) => `last:widget:${itemId}`
const PING_KEY = (itemId: string) => `last:ping:${itemId}`

/** Get the last cached datapoint for an item. */
export function getLastDatapoint(itemId: string): ItemDatapoint | null {
  const widgetData = getCachedAny<ServiceData>(WIDGET_KEY(itemId))
  const pingStatus = getCachedAny<ServiceStatus>(PING_KEY(itemId))

  if (!widgetData && !pingStatus) return null

  return {
    widgetData,
    pingStatus,
    timestamp: Date.now(),
  }
}

/** Cache widget data for an item. */
export function cacheWidgetData(itemId: string, data: ServiceData): void {
  setCached(WIDGET_KEY(itemId), data)
}

/** Cache ping status for an item. */
export function cachePingStatus(itemId: string, status: ServiceStatus): void {
  setCached(PING_KEY(itemId), status)
}

/**
 * Batch preload datapoints for multiple items.
 * Returns a map of itemId -> ItemDatapoint (only for items with cached data).
 */
export function preloadDatapoints(
  itemIds: string[]
): Record<string, ItemDatapoint> {
  const results: Record<string, ItemDatapoint> = {}

  for (const itemId of itemIds) {
    const datapoint = getLastDatapoint(itemId)
    if (datapoint) {
      results[itemId] = datapoint
    }
  }

  return results
}
