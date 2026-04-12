import type { ServiceData, ServiceStatus } from "@/lib/adapters/types"

export interface CachedItem {
  widgetData: ServiceData | null
  pingStatus: ServiceStatus | null
  lastFetchedAt: number
}

type UpdateCallback = (
  itemId: string,
  widgetData: ServiceData | null,
  pingStatus: ServiceStatus | null
) => void

/**
 * Shared in-memory cache for all service data.
 * Singleton — same instance across all requests and SSE connections.
 */
class ServerCache {
  private cache = new Map<string, CachedItem>()
  private listeners = new Set<UpdateCallback>()

  get(itemId: string): CachedItem | null {
    return this.cache.get(itemId) ?? null
  }

  set(itemId: string, data: Partial<CachedItem>): void {
    const existing = this.cache.get(itemId) ?? {
      widgetData: null,
      pingStatus: null,
      lastFetchedAt: 0,
    }
    const updated = {
      ...existing,
      ...data,
      lastFetchedAt: Date.now(),
    }
    this.cache.set(itemId, updated)

    // Notify listeners
    for (const cb of this.listeners) {
      try {
        cb(itemId, updated.widgetData, updated.pingStatus)
      } catch (err) {
        console.error("[server-cache] Error in update listener:", err)
      }
    }
  }

  getAll(): [string, CachedItem][] {
    return [...this.cache.entries()]
  }

  /** Subscribe to cache updates. Returns unsubscribe function. */
  onUpdate(callback: UpdateCallback): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  /** Seed data for E2E tests */
  seed(itemId: string, widgetData: ServiceData): void {
    this.cache.set(itemId, {
      widgetData,
      pingStatus: null,
      lastFetchedAt: Date.now(),
    })
  }

  clear(): void {
    this.cache.clear()
  }
}

export const serverCache = new ServerCache()
