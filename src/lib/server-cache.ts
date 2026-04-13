import { db } from "@/lib/db"
import { widgetCache } from "@/lib/db/schema"
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

/** Max age before cached data is considered stale for SSR (5 minutes). */
const SSR_MAX_AGE_MS = 5 * 60 * 1000

/**
 * Server-side cache backed by SQLite.
 *
 * - Writes go through `set()` → persisted to DB + in-memory map
 * - Reads use the in-memory map (instant)
 * - On startup the map is seeded from DB so SSR has data immediately
 */
class ServerCache {
  private cache = new Map<string, CachedItem>()
  private listeners = new Set<UpdateCallback>()
  private loaded = false

  /** Load all cached items from DB into memory. Called lazily on first read. */
  loadFromDb(): void {
    if (this.loaded) return
    try {
      const rows = db.select().from(widgetCache).all()
      for (const row of rows) {
        this.cache.set(row.itemId, {
          widgetData: (row.widgetData as ServiceData) ?? null,
          pingStatus: (row.pingStatus as ServiceStatus) ?? null,
          lastFetchedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : 0,
        })
      }
      this.loaded = true
      console.log(`[server-cache] Loaded ${rows.length} item(s) from DB`)
    } catch (err) {
      console.error("[server-cache] Failed to load from DB:", err)
      this.loaded = true // don't retry on every read
    }
  }

  get(itemId: string): CachedItem | null {
    this.loadFromDb() // no-op if already loaded
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

    // Persist to DB (fire-and-forget — don't block the caller)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wd = updated.widgetData as any
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ps = updated.pingStatus as any
    db.insert(widgetCache)
      .values({
        itemId,
        widgetData: wd,
        pingStatus: ps,
        updatedAt: new Date().toISOString(),
      })
      .onConflictDoUpdate({
        target: widgetCache.itemId,
        set: {
          widgetData: wd,
          pingStatus: ps,
          updatedAt: new Date().toISOString(),
        },
      })
      .catch((err) => {
        console.error("[server-cache] DB write failed:", err)
      })

    // Notify listeners (SSE)
    for (const cb of this.listeners) {
      try {
        cb(itemId, updated.widgetData, updated.pingStatus)
      } catch (err) {
        console.error("[server-cache] Error in update listener:", err)
      }
    }
  }

  getAll(): [string, CachedItem][] {
    this.loadFromDb() // no-op if already loaded
    return [...this.cache.entries()]
  }

  /** Get items fresh enough for SSR rendering. */
  getAllFresh(maxAgeMs: number = SSR_MAX_AGE_MS): [string, CachedItem][] {
    // Always reload from DB to ensure we have the latest seeded data
    this.loaded = false
    this.loadFromDb()
    const now = Date.now()
    return [...this.cache.entries()].filter(
      ([, item]) => now - item.lastFetchedAt < maxAgeMs
    )
  }

  /** Subscribe to cache updates. Returns unsubscribe function. */
  onUpdate(callback: UpdateCallback): () => void {
    this.listeners.add(callback)
    return () => {
      this.listeners.delete(callback)
    }
  }

  async seed(itemId: string, widgetData: ServiceData): Promise<void> {
    const entry: CachedItem = {
      widgetData,
      pingStatus: null,
      lastFetchedAt: Date.now(),
    }
    this.cache.set(itemId, entry)

    // Persist to DB synchronously so it's available immediately
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wd = widgetData as any
    try {
      await db
        .insert(widgetCache)
        .values({
          itemId,
          widgetData: wd,
          pingStatus: null,
          updatedAt: new Date().toISOString(),
        })
        .onConflictDoUpdate({
          target: widgetCache.itemId,
          set: {
            widgetData: wd,
            pingStatus: null,
            updatedAt: new Date().toISOString(),
          },
        })
    } catch (err) {
      console.error("[server-cache] DB seed failed:", err)
    }
  }

  clear(): void {
    this.cache.clear()
    this.loaded = false // Force reload from DB on next read
  }
}

export const serverCache = new ServerCache()
