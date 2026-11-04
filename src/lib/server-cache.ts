import { recordHistory } from "./history-store";
import { db } from "@/lib/db";
import { widgetCache } from "@/lib/db/schema";
import { eq } from "drizzle-orm";
import type { ServiceData, ServiceStatus } from "@/lib/adapters/types";

export interface CachedItem {
  widgetData: ServiceData | null;
  pingStatus: ServiceStatus | null;
  lastFetchedAt: number;
  configurationRevision: number | null;
  lastAttemptAt: number | null;
  lastSuccessAt: number | null;
  freshness: "fresh" | "stale" | "unknown";
}

type UpdateCallback = (
  itemId: string,
  widgetData: ServiceData | null,
  pingStatus: ServiceStatus | null,
  observation: CachedItem,
) => void;

/** Max age before cached data is considered stale for SSR (5 minutes). */
const SSR_MAX_AGE_MS = 5 * 60 * 1000;

/**
 * Server-side cache backed by SQLite.
 *
 * - Writes go through `set()` → persisted to DB + in-memory map
 * - Reads use the in-memory map (instant)
 * - On startup the map is seeded from DB so SSR has data immediately
 */
class ServerCache {
  private cache = new Map<string, CachedItem>();
  private listeners = new Set<UpdateCallback>();
  private loaded = false;
  private lastDbLoadAt = 0;

  /** Load all cached items from DB into memory. Called lazily on first read. */
  loadFromDb(force = false): void {
    if (this.loaded && !force) return;
    try {
      const rows = db.select().from(widgetCache).all();
      for (const row of rows) {
        const fromDb: CachedItem = {
          widgetData: (row.widgetData as ServiceData) ?? null,
          pingStatus: (row.pingStatus as ServiceStatus) ?? null,
          lastFetchedAt: row.updatedAt ? new Date(row.updatedAt).getTime() : 0,
          configurationRevision: row.configurationRevision ?? null,
          lastAttemptAt: row.lastAttemptAt ?? null,
          lastSuccessAt: row.lastSuccessAt ?? null,
          freshness:
            row.freshness === "fresh" || row.freshness === "stale" ? row.freshness : "unknown",
        };
        const existing = this.cache.get(row.itemId);
        if (!existing || existing.lastFetchedAt <= fromDb.lastFetchedAt) {
          this.cache.set(row.itemId, fromDb);
        }
      }
      this.loaded = true;
      this.lastDbLoadAt = Date.now();
      console.log(`[server-cache] Loaded ${rows.length} item(s) from DB`);
    } catch (err) {
      console.error("[server-cache] Failed to load from DB:", err);
      this.loaded = true; // don't retry on every read
    }
  }

  get(itemId: string): CachedItem | null {
    this.loadFromDb(); // no-op if already loaded
    return this.cache.get(itemId) ?? null;
  }

  set(
    itemId: string,
    data: Partial<CachedItem>,
    outcome: { successful?: boolean; attemptAt?: number; configurationRevision?: number } = {},
  ): void {
    this.loadFromDb();
    const saved = this.cache.get(itemId);
    const compatible =
      saved &&
      (outcome.configurationRevision === undefined ||
        saved.configurationRevision === null ||
        saved.configurationRevision === outcome.configurationRevision);
    const existing = (compatible ? saved : null) ?? {
      widgetData: null,
      pingStatus: null,
      lastFetchedAt: 0,
      configurationRevision: null,
      lastAttemptAt: null,
      lastSuccessAt: null,
      freshness: "unknown" as const,
    };
    const now = Date.now();
    const successful = outcome.successful ?? data.widgetData?._status !== "error";
    const updated: CachedItem = {
      ...existing,
      ...data,
      lastFetchedAt: now,
      configurationRevision: outcome.configurationRevision ?? existing.configurationRevision,
      lastAttemptAt: outcome.attemptAt ?? now,
      lastSuccessAt: successful ? (outcome.attemptAt ?? now) : existing.lastSuccessAt,
      freshness: successful ? "fresh" : "stale",
    };
    this.cache.set(itemId, updated);
    this.loaded = true;

    // Persist to DB (fire-and-forget — don't block the caller)
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wd = updated.widgetData as any;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const ps = updated.pingStatus as any;
    db.insert(widgetCache)
      .values({
        itemId,
        widgetData: wd,
        pingStatus: ps,
        updatedAt: new Date(now).toISOString(),
        configurationRevision: updated.configurationRevision,
        lastAttemptAt: updated.lastAttemptAt,
        lastSuccessAt: updated.lastSuccessAt,
        freshness: updated.freshness,
      })
      .onConflictDoUpdate({
        target: widgetCache.itemId,
        set: {
          widgetData: wd,
          pingStatus: ps,
          updatedAt: new Date(now).toISOString(),
          configurationRevision: updated.configurationRevision,
          lastAttemptAt: updated.lastAttemptAt,
          lastSuccessAt: updated.lastSuccessAt,
          freshness: updated.freshness,
        },
      })
      .catch((err) => {
        console.error("[server-cache] DB write failed:", err);
      });

    if (outcome.configurationRevision !== undefined) {
      try {
        recordHistory(
          itemId,
          outcome.configurationRevision,
          updated.lastAttemptAt!,
          updated.widgetData,
          updated.pingStatus,
          successful,
        );
      } catch {
        console.warn("[history] Unable to persist observation; check database migrations");
      }
    }

    // Notify listeners (SSE)
    // console.log(
    //   `[server-cache] Notifying ${this.listeners.size} listeners for ${itemId}:`,
    //   updated.pingStatus?.state ?? updated.widgetData?._status ?? "unknown",
    // );
    for (const cb of this.listeners) {
      try {
        cb(itemId, updated.widgetData, updated.pingStatus, updated);
      } catch (err) {
        console.error("[server-cache] Error in update listener:", err);
      }
    }
  }

  getAll(): [string, CachedItem][] {
    this.loadFromDb(); // no-op if already loaded
    return [...this.cache.entries()];
  }

  /** Reload all cached items from DB and return the full map (no freshness filtering). */
  getAllReloaded(): [string, CachedItem][] {
    this.loadFromDb(true);
    return [...this.cache.entries()];
  }

  /** Get items fresh enough for SSR rendering. */
  getAllFresh(maxAgeMs: number = SSR_MAX_AGE_MS): [string, CachedItem][] {
    const now = Date.now();
    const shouldAlwaysReloadForSsr = process.env.NODE_ENV !== "production";
    const shouldReload =
      shouldAlwaysReloadForSsr || !this.loaded || now - this.lastDbLoadAt >= maxAgeMs;
    if (shouldReload) {
      this.loadFromDb(true);
    }
    return [...this.cache.entries()].filter(
      ([, item]) =>
        item.freshness === "fresh" &&
        item.lastSuccessAt !== null &&
        now - item.lastSuccessAt < maxAgeMs,
    );
  }

  /** Subscribe to cache updates. Returns unsubscribe function. */
  onUpdate(callback: UpdateCallback): () => void {
    this.listeners.add(callback);
    return () => {
      this.listeners.delete(callback);
    };
  }

  async seed(itemId: string, widgetData: ServiceData): Promise<void> {
    this.loadFromDb();
    const now = Date.now();
    const entry: CachedItem = {
      widgetData,
      pingStatus: null,
      lastFetchedAt: now,
      configurationRevision: null,
      lastAttemptAt: now,
      lastSuccessAt: widgetData._status === "error" ? null : now,
      freshness: widgetData._status === "error" ? "stale" : "fresh",
    };
    this.cache.set(itemId, entry);
    this.loaded = true;

    // Persist to DB synchronously so it's available immediately
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const wd = widgetData as any;
    try {
      await db
        .insert(widgetCache)
        .values({
          itemId,
          widgetData: wd,
          pingStatus: null,
          updatedAt: new Date(now).toISOString(),
          lastAttemptAt: entry.lastAttemptAt,
          lastSuccessAt: entry.lastSuccessAt,
          freshness: entry.freshness,
          configurationRevision: null,
        })
        .onConflictDoUpdate({
          target: widgetCache.itemId,
          set: {
            widgetData: wd,
            pingStatus: null,
            updatedAt: new Date(now).toISOString(),
            lastAttemptAt: entry.lastAttemptAt,
            lastSuccessAt: entry.lastSuccessAt,
            freshness: entry.freshness,
            configurationRevision: null,
          },
        });
    } catch (err) {
      console.error("[server-cache] DB seed failed:", err);
    }
  }

  clear(): void {
    this.cache.clear();
    this.loaded = false; // Force reload from DB on next read
    this.lastDbLoadAt = 0;
  }

  async delete(itemId: string): Promise<void> {
    this.cache.delete(itemId);
    try {
      await db.delete(widgetCache).where(eq(widgetCache.itemId, itemId));
    } catch (err) {
      console.error("[server-cache] DB delete failed:", err);
    }
  }
}

const globalCache = globalThis as typeof globalThis & { __labitatServerCache?: ServerCache };
export const serverCache =
  process.env.NODE_ENV === "test"
    ? new ServerCache()
    : (globalCache.__labitatServerCache ??= new ServerCache());
