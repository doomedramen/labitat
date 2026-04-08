"use server"

import { fetchServiceData } from "./services"
import { preloadDatapoints } from "@/lib/last-datapoints"
import type { ServiceData } from "@/lib/adapters/types"

/**
 * Fetch widget data for a single item.
 * This server action is designed to be used with SWR for client-side fetching.
 * Keeps API keys and credentials secure on the server.
 */
export async function getWidgetData(itemId: string): Promise<ServiceData> {
  return fetchServiceData(itemId)
}

/**
 * Batch fetch widget data for multiple items.
 * More efficient than individual calls when loading multiple widgets.
 */
export async function getBatchWidgetData(
  itemIds: string[]
): Promise<Record<string, ServiceData>> {
  const results = await Promise.all(
    itemIds.map(async (id) => {
      try {
        const data = await fetchServiceData(id)
        return [id, data] as const
      } catch {
        return [
          id,
          {
            _status: "error",
            _statusText: "Failed to fetch",
          },
        ] as const
      }
    })
  )
  return Object.fromEntries(results)
}

/**
 * Preload all cached datapoints for SSR.
 * Returns the last known state for each item.
 */
export async function preloadAllDatapoints(itemIds: string[]) {
  return preloadDatapoints(itemIds)
}
