"use server"

import { db } from "@/lib/db"
import { items } from "@/lib/db/schema"
import { eq } from "drizzle-orm"
import { decrypt } from "@/lib/crypto"
import { getCachedWithFallback, setCached } from "@/lib/cache"
import { cacheWidgetData } from "@/lib/last-datapoints"
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

  // Single lookup: returns fresh data if within TTL, or expired data as offline fallback
  const { fresh, expired: expiredCache } =
    await getCachedWithFallback<ServiceData>(`service:${itemId}`, pollingMs)
  if (fresh) return fresh
  const hasExpiredCache = expiredCache !== null

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
        `[labitat] Failed to decrypt config for item ${itemId} (${item.serviceType}):`,
        err instanceof Error ? err.message : err
      )
      // Don't cache decryption failures — if SECRET_KEY rotates, a cached error
      // would permanently block the item until the cache file is cleared.
      return {
        _status: "error",
        _statusText: "Failed to decrypt credentials — check SECRET_KEY",
      }
    }
  }

  // Fetch live data (only for server-side adapters)
  try {
    if (!adapter.fetchData) {
      // Client-side widget - return config for client to handle
      return {
        _status: "none" as const,
        ...config,
      }
    }

    // For client-side widgets, still call fetchData to get computed values
    // (e.g., datetime widget needs timeZoneOffset computed from timeZone config)
    if (adapter.clientSide && adapter.fetchData) {
      const data = await adapter.fetchData(config)
      return {
        ...data,
        _status: data._status ?? "none",
      }
    }

    const data = await adapter.fetchData(config)
    const responseData: ServiceData = {
      ...data,
      _status: data._status ?? "ok",
    }
    await setCached(`service:${itemId}`, responseData)
    await cacheWidgetData(itemId, responseData)
    return responseData
  } catch (err) {
    // If we have expired cache data, return it as fallback with a warning
    // Don't log errors when we have cached fallback - prevents console spam when offline
    if (hasExpiredCache) {
      const fallbackResponse: ServiceData = {
        ...expiredCache,
        _status: "warn" as const,
        _statusText: "Showing cached data - unable to reach service",
      }
      await cacheWidgetData(itemId, fallbackResponse)
      return fallbackResponse
    }

    // Only log errors when we don't have cached fallback
    console.error(
      `[labitat] Failed to fetch data for item ${itemId} (${item.serviceType}):`,
      err
    )

    // Sanitize error message for client - don't expose internal details
    const isProduction = process.env.NODE_ENV === "production"
    const errorResponse: ServiceData = {
      _status: "error",
      _statusText: isProduction
        ? "Failed to fetch service data"
        : err instanceof Error
          ? err.message
          : "Failed to fetch data",
    }
    // Cache errors briefly to avoid hammering
    await setCached(`service:${itemId}`, errorResponse)
    await cacheWidgetData(itemId, errorResponse)
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
