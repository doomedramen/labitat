"use server"

import { db } from "@/lib/db"
import { items } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { decrypt } from "@/lib/crypto"
import { getCached, setCached } from "@/lib/cache"
import { getService } from "@/lib/adapters"
import type { ServiceData } from "@/lib/adapters/types"

export async function fetchServiceData(itemId: string): Promise<ServiceData> {
  // Load item from DB
  const [item] = await db.select().from(items).where(eq(items.id, itemId))
  if (!item) {
    return { _status: "error", _statusText: "Item not found" }
  }

  // Check if item has a service adapter
  if (!item.serviceType) {
    return { _status: "none" }
  }

  // Get the adapter
  const adapter = getService(item.serviceType)
  if (!adapter) {
    return { _status: "error", _statusText: "Unknown service type" }
  }

  const pollingMs = item.pollingMs ?? adapter.defaultPollingMs ?? 10000

  // Check cache
  const cached = getCached<ServiceData>(`service:${itemId}`, pollingMs)
  if (cached) {
    return cached
  }

  // Build config object - decrypt password fields
  const config: Record<string, string> = {}

  // Add base URL
  if (item.serviceUrl) {
    config.url = item.serviceUrl
  }

  // Decrypt stored config
  if (item.configEnc) {
    try {
      const decryptedConfig = JSON.parse(await decrypt(item.configEnc))
      Object.assign(config, decryptedConfig)
    } catch (err) {
      console.error(
        `[labitat] Failed to decrypt config for item ${itemId}:`,
        err
      )
      const errorResponse: ServiceData = {
        _status: "error",
        _statusText: "Failed to decrypt credentials — check SECRET_KEY",
      }
      setCached(`service:${itemId}`, errorResponse)
      return errorResponse
    }
  }

  // Fetch live data
  try {
    const data = await adapter.fetchData(config)
    const responseData: ServiceData = {
      ...data,
      _status: data._status ?? "ok",
    }
    setCached(`service:${itemId}`, responseData)
    return responseData
  } catch (err) {
    const errorResponse: ServiceData = {
      _status: "error",
      _statusText: err instanceof Error ? err.message : "Failed to fetch data",
    }
    // Cache errors briefly to avoid hammering
    setCached(`service:${itemId}`, errorResponse)
    return errorResponse
  }
}

// Fetch multiple services in parallel
export async function fetchAllServiceData(
  itemIds: string[]
): Promise<Record<string, ServiceData>> {
  const results = await Promise.all(
    itemIds.map(async (id) => {
      const data = await fetchServiceData(id)
      return [id, data] as const
    })
  )
  return Object.fromEntries(results)
}
