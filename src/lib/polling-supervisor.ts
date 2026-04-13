import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";
import { getService } from "@/lib/adapters";
import { fetchWithTimeout } from "@/lib/adapters/fetch-with-timeout";
import { serverCache } from "./server-cache";

const GRACE_PERIOD_MS = 5 * 60 * 1000; // 5 minutes
const PING_TIMEOUT_MS = 10_000;
const MIN_TICK_MS = 100; // Minimum wake-up delay

type PollingItem = {
  id: string;
  serviceType: string | null;
  href: string | null;
  serviceUrl: string | null;
  configEnc: string | null;
  pollingMs: number;
  lastPolledAt: number; // unix ms
};

class PollingSupervisor {
  private timer: ReturnType<typeof setTimeout> | null = null;
  private activeConnections = 0;
  private graceTimer: ReturnType<typeof setTimeout> | null = null;
  private itemCache: PollingItem[] = [];
  private cacheExpiresAt = 0;
  private running = new Set<string>(); // Prevent concurrent polls on same item

  /** A client connected — start polling if needed */
  connect(): void {
    const prev = this.activeConnections;
    this.activeConnections++;
    console.log(`[polling] Client connected: ${prev} → ${this.activeConnections}`);
    if (this.graceTimer) {
      clearTimeout(this.graceTimer);
      this.graceTimer = null;
    }
    if (this.activeConnections === 1) {
      this.start();
    }
  }

  /** A client disconnected — maybe stop polling after grace period */
  disconnect(): void {
    const prev = this.activeConnections;
    this.activeConnections = Math.max(0, this.activeConnections - 1);
    console.log(
      `[polling] Client disconnected: ${prev} → ${this.activeConnections}${this.activeConnections === 0 ? " — ALL CLIENTS DISCONNECTED" : ""}`,
    );
    if (this.activeConnections === 0) {
      this.graceTimer = setTimeout(() => {
        this.stop();
      }, GRACE_PERIOD_MS);
    }
  }

  /** Start the supervisor — first tick immediately, then reschedule dynamically */
  private start(): void {
    if (this.timer) return;
    console.log("[polling] Supervisor started");
    this.tick().catch(console.error);
  }

  /** Stop the supervisor */
  stop(): void {
    if (this.timer) {
      clearTimeout(this.timer);
      this.timer = null;
      this.itemCache = [];
      this.cacheExpiresAt = 0;
      console.log("[polling] Supervisor stopped (no active connections)");
    }
  }

  /** Invalidate the item cache (call after item create/update/delete) */
  invalidateCache(): void {
    this.cacheExpiresAt = 0;
  }

  /** Load items from DB with simple TTL cache */
  private async getItems(): Promise<PollingItem[]> {
    const now = Date.now();
    if (now < this.cacheExpiresAt) return this.itemCache;

    // Preserve lastPolledAt from existing cache to maintain polling schedule
    const existingLastPolled = new Map(this.itemCache.map((i) => [i.id, i.lastPolledAt]));

    try {
      const allItems = await db.select().from(items);
      this.itemCache = allItems
        .filter((item) => item.serviceType || item.href)
        .map((item) => {
          const adapter = item.serviceType ? getService(item.serviceType) : null;
          const pollingMs = item.pollingMs ?? adapter?.defaultPollingMs ?? 30_000;
          return {
            id: item.id,
            serviceType: item.serviceType,
            href: item.href,
            serviceUrl: item.serviceUrl,
            configEnc: item.configEnc,
            pollingMs,
            lastPolledAt: existingLastPolled.get(item.id) ?? 0,
          };
        });
      // Cache for 10 seconds
      this.cacheExpiresAt = now + 10_000;
      console.log(`[polling] Loaded ${this.itemCache.length} item(s) from DB`);
    } catch (err) {
      console.error("[polling] Failed to load items from DB:", err);
    }

    return this.itemCache;
  }

  /** Main tick — check all items and poll those that are due, then reschedule for next due item */
  private async tick(): Promise<void> {
    const now = Date.now();
    const items = await this.getItems();

    let nextDue = Infinity;

    for (const item of items) {
      const dueAt = item.lastPolledAt + item.pollingMs;
      if (dueAt < nextDue) nextDue = dueAt;

      // Skip if already running for this item
      if (this.running.has(item.id)) continue;

      if (now >= dueAt) {
        // Mark as polled immediately to prevent double-firing
        item.lastPolledAt = now;
        this.running.add(item.id);

        // Fire-and-forget with error handling
        this.runPoll(item)
          .catch((err) => console.error(`[polling] Error polling ${item.id}:`, err))
          .finally(() => {
            this.running.delete(item.id);
          });
      }
    }

    // Reschedule: wake up exactly when the next item is due
    if (items.length > 0 && this.activeConnections > 0) {
      const delay = Math.max(nextDue - Date.now(), MIN_TICK_MS);
      this.timer = setTimeout(() => this.tick(), delay);
    } else {
      this.timer = null;
    }
  }

  /** Execute poll for a single item */
  private async runPoll(item: PollingItem): Promise<void> {
    try {
      if (item.serviceType) {
        const adapter = item.serviceType ? getService(item.serviceType) : null;
        if (!adapter?.fetchData) return;

        const config: Record<string, string> = {};
        if (item.serviceUrl) config.url = item.serviceUrl;
        if (item.configEnc) {
          try {
            const decrypted = JSON.parse(await decrypt(item.configEnc));
            Object.assign(config, decrypted);
          } catch {
            serverCache.set(item.id, {
              widgetData: {
                _status: "error",
                _statusText: "Failed to decrypt credentials",
              },
            });
            return;
          }
        }
        const data = await adapter.fetchData(config);
        serverCache.set(item.id, { widgetData: data });
      } else if (item.href) {
        try {
          const res = await fetchWithTimeout(item.href, { method: "GET" }, PING_TIMEOUT_MS);
          serverCache.set(item.id, {
            pingStatus: res.ok
              ? { state: "reachable" }
              : {
                  state: "error" as const,
                  reason: `HTTP ${res.status}`,
                  httpStatus: res.status,
                },
          });
        } catch (err) {
          const isTimeout = err instanceof DOMException && err.name === "TimeoutError";
          serverCache.set(item.id, {
            pingStatus: isTimeout
              ? {
                  state: "slow" as const,
                  reason: "Request timed out",
                  timeoutMs: PING_TIMEOUT_MS,
                }
              : {
                  state: "unreachable" as const,
                  reason: "Request failed",
                },
          });
        }
      }
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === "TimeoutError";
      const errorText = isTimeout
        ? "Request timed out"
        : err instanceof Error
          ? err.message
          : "Failed to fetch";

      const cached = serverCache.get(item.id);
      if (
        cached?.widgetData &&
        (cached.widgetData._status === "ok" || cached.widgetData._status === "warn")
      ) {
        serverCache.set(item.id, {
          widgetData: {
            ...cached.widgetData,
            _status: "warn",
            _statusText: `${errorText} — showing cached data`,
          },
        });
      } else {
        serverCache.set(item.id, {
          widgetData: {
            _status: "error",
            _statusText: errorText,
          },
        });
      }
    }
  }

  getConnectionCount(): number {
    return this.activeConnections;
  }
}

export const pollingSup = new PollingSupervisor();
