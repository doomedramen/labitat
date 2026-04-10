"use server"

import { fetchServiceData } from "./services"
import { preloadDatapoints } from "@/lib/last-datapoints"
import { isAuthenticated } from "@/lib/auth/guard"
import type { ServiceData } from "@/lib/adapters/types"

export async function getWidgetData(itemId: string): Promise<ServiceData> {
  // Auth not required for viewing — only editing requires authentication
  await isAuthenticated() // session check but no throw
  return fetchServiceData(itemId)
}

export async function getBatchWidgetData(
  itemIds: string[]
): Promise<Record<string, ServiceData>> {
  // Auth not required for viewing — only editing requires authentication
  await isAuthenticated() // session check but no throw
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
  // Called during SSR — return empty data for unauthenticated users
  // instead of throwing, so the dashboard can render the login UI
  if (!(await isAuthenticated())) return {}
  return preloadDatapoints(itemIds)
}
