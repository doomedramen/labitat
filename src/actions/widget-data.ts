"use server"

import { fetchServiceData } from "./services"
import { preloadDatapoints } from "@/lib/last-datapoints"
import type { ServiceData } from "@/lib/adapters/types"

export async function getWidgetData(itemId: string): Promise<ServiceData> {
  return fetchServiceData(itemId)
}

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
          { _status: "error" as const, _statusText: "Failed to fetch" },
        ] as const
      }
    })
  )
  return Object.fromEntries(results)
}

export async function preloadAllDatapoints(itemIds: string[]) {
  return preloadDatapoints(itemIds)
}
