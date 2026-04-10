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
  // Auth not required for viewing — only editing requires authentication
  const [item] = await db.select().from(items).where(eq(items.id, itemId))
  if (!item) {
    return { _status: "error", _statusText: "Item not found" }
  }

  if (!item.serviceType) {
    return { _status: "none" }
  }

  const adapter = getService(item.serviceType)
  if (!adapter) {
    return { _status: "error", _statusText: "Unknown service type" }
  }

  const pollingMs = item.pollingMs ?? adapter.defaultPollingMs ?? 10000

  const { fresh, expired: expiredCache } =
    await getCachedWithFallback<ServiceData>(`service:${itemId}`, pollingMs)
  if (fresh) return fresh
  const hasExpiredCache = expiredCache !== null

  const config: Record<string, string> = {}

  if (item.serviceUrl) {
    config.url = item.serviceUrl
  }

  if (item.configEnc) {
    try {
      const decryptedConfig = JSON.parse(await decrypt(item.configEnc))
      Object.assign(config, decryptedConfig)
    } catch (err) {
      console.error(
        `[labitat] Failed to decrypt config for item ${itemId} (${item.serviceType}):`,
        err instanceof Error ? err.message : err
      )
      return {
        _status: "error",
        _statusText: "Failed to decrypt credentials — check SECRET_KEY",
      }
    }
  }

  try {
    if (!adapter.fetchData) {
      return { _status: "none" as const, ...config }
    }

    if (adapter.clientSide && adapter.fetchData) {
      const data = await adapter.fetchData(config)
      return { ...data, _status: data._status ?? "none" }
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
    if (hasExpiredCache) {
      const fallbackResponse: ServiceData = {
        ...expiredCache,
        _status: "warn" as const,
        _statusText: "Showing cached data - unable to reach service",
      }
      await cacheWidgetData(itemId, fallbackResponse)
      return fallbackResponse
    }

    console.error(
      `[labitat] Failed to fetch data for item ${itemId} (${item.serviceType}):`,
      err
    )

    const isProduction = process.env.NODE_ENV === "production"
    const errorResponse: ServiceData = {
      _status: "error",
      _statusText: isProduction
        ? "Failed to fetch service data"
        : err instanceof Error
          ? err.message
          : "Failed to fetch data",
    }
    await setCached(`service:${itemId}`, errorResponse)
    await cacheWidgetData(itemId, errorResponse)
    return errorResponse
  }
}

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
