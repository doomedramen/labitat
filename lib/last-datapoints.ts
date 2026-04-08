import { getCachedAny, setCached } from "./cache"
import type { ServiceData, ServiceStatus } from "./adapters/types"

export interface ItemDatapoint {
  widgetData: ServiceData | null
  pingStatus: ServiceStatus | null
  timestamp: number
}

const WIDGET_KEY = (itemId: string) => `last:widget:${itemId}`
const PING_KEY = (itemId: string) => `last:ping:${itemId}`

/**
 * Get the last cached datapoint for an item.
 * Returns null if no data exists.
 */
export async function getLastDatapoint(
  itemId: string
): Promise<ItemDatapoint | null> {
  const [widgetData, pingStatus] = await Promise.all([
    getCachedAny<ServiceData>(WIDGET_KEY(itemId)),
    getCachedAny<ServiceStatus>(PING_KEY(itemId)),
  ])

  if (!widgetData && !pingStatus) return null

  return {
    widgetData,
    pingStatus,
    timestamp: Date.now(),
  }
}

/**
 * Cache widget data for an item.
 */
export async function cacheWidgetData(
  itemId: string,
  data: ServiceData
): Promise<void> {
  await setCached(WIDGET_KEY(itemId), data)
}

/**
 * Cache ping status for an item.
 */
export async function cachePingStatus(
  itemId: string,
  status: ServiceStatus
): Promise<void> {
  await setCached(PING_KEY(itemId), status)
}

/**
 * Batch preload datapoints for multiple items.
 * Returns a map of itemId -> ItemDatapoint (only for items with cached data).
 */
export async function preloadDatapoints(
  itemIds: string[]
): Promise<Record<string, ItemDatapoint>> {
  const results: Record<string, ItemDatapoint> = {}

  await Promise.all(
    itemIds.map(async (itemId) => {
      const datapoint = await getLastDatapoint(itemId)
      if (datapoint) {
        results[itemId] = datapoint
      }
    })
  )

  return results
}
