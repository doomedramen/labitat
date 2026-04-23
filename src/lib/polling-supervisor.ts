import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";
import { getService } from "@/lib/adapters";
import { fetchWithTimeout } from "@/lib/adapters/fetch-with-timeout";
import { serverCache } from "./server-cache";

// Environment defaults - extracted for clarity and testability
const ENV_DEFAULTS = {
  IDLE_POLLING_ENABLED: true,
  IDLE_POLLING_INTERVAL_MINUTES: 5,
} as const;

// Get env values safely with defaults
function getEnvValue<T extends keyof typeof ENV_DEFAULTS>(key: T): (typeof ENV_DEFAULTS)[T] {
  try {
    const env = process.env;
    switch (key) {
      case "IDLE_POLLING_ENABLED":
        return (env.IDLE_POLLING_ENABLED === "true") as never;
      case "IDLE_POLLING_INTERVAL_MINUTES":
        const val = env.IDLE_POLLING_INTERVAL_MINUTES;
        return (val ? parseInt(val, 10) : ENV_DEFAULTS[key]) as never;
      default:
        return ENV_DEFAULTS[key];
    }
  } catch {
    return ENV_DEFAULTS[key];
  }
}

const GRACE_PERIOD_MS = 5 * 60 * 1000;
const PING_TIMEOUT_MS = 10_000;
const MIN_TICK_MS = 100;
const IDLE_POLLING_MS = () => getEnvValue("IDLE_POLLING_INTERVAL_MINUTES") * 60 * 1000;

type PollingItem = {
  id: string;
  serviceType: string | null;
  href: string | null;
  serviceUrl: string | null;
  configEnc: string | null;
  pollingMs: number;
  lastPolledAt: number;
  retryCount: number;
};

interface SchedulerState {
  timer: ReturnType<typeof setTimeout> | null;
  graceTimer: ReturnType<typeof setTimeout> | null;
  activeConnections: number;
  idleMode: boolean;
}

class PollingSupervisor {
  private state: SchedulerState = {
    timer: null,
    graceTimer: null,
    activeConnections: 0,
    idleMode: false,
  };

  private itemCache: PollingItem[] = [];
  private cacheExpiresAt = 0;
  private running = new Set<string>();
  private shouldStaggerOnNextStart = false;
  private hasStartedOnce = false;

  connect(): void {
    const prev = this.state.activeConnections;
    this.state.activeConnections++;
    console.log(`[polling] Client connected: ${prev} → ${this.state.activeConnections}`);

    this.clearGraceTimer();

    if (this.state.idleMode) {
      this.exitIdleMode();
    } else if (this.state.activeConnections === 1) {
      this.start();
    }
  }

  disconnect(): void {
    const prev = this.state.activeConnections;
    this.state.activeConnections = Math.max(0, prev - 1);
    console.log(
      `[polling] Client disconnected: ${prev} → ${this.state.activeConnections}${
        this.state.activeConnections === 0 ? " — ALL CLIENTS DISCONNECTED" : ""
      }`,
    );

    if (this.state.activeConnections === 0) {
      this.state.graceTimer = setTimeout(() => {
        this.enterIdleMode();
      }, GRACE_PERIOD_MS);
    }
  }

  async pollNow(): Promise<void> {
    // Cancel any pending tick to avoid race conditions
    this.clearTickTimer();

    const items = await this.getItems();
    const now = Date.now();

    // Fire-and-forget all polls
    items.forEach((item) => {
      this.executePoll(item, now);
    });

    // Reschedule if still active
    this.scheduleNextTick();
  }

  stop(): void {
    this.clearTickTimer();
    this.clearGraceTimer();
    this.cacheExpiresAt = 0;
    this.shouldStaggerOnNextStart = this.hasStartedOnce;
    this.state.idleMode = false;
    console.log("[polling] Supervisor stopped");
  }

  invalidateCache(): void {
    this.cacheExpiresAt = 0;
  }

  private start(): void {
    if (this.state.timer) return;
    this.hasStartedOnce = true;
    console.log("[polling] Supervisor started");
    this.tick();
  }

  private enterIdleMode(): void {
    if (this.state.idleMode) return;

    if (!getEnvValue("IDLE_POLLING_ENABLED")) {
      this.stop();
      return;
    }

    this.state.idleMode = true;
    console.log("[polling] Entering idle mode");

    this.clearTickTimer();
    this.tick();
  }

  private exitIdleMode(): void {
    if (!this.state.idleMode) return;

    this.state.idleMode = false;
    console.log("[polling] Exiting idle mode");

    this.pollNow().catch(console.error);
  }

  private async tick(): Promise<void> {
    const items = await this.getItems();
    const now = Date.now();

    if (this.shouldStaggerOnNextStart) {
      this.staggerOverdueItems(items, now);
      this.shouldStaggerOnNextStart = false;
    }

    // Execute due polls (fire-and-forget to not block scheduling)
    const dueItems = items.filter((item) => this.isDue(item, now));
    dueItems.forEach((item) => {
      this.executePoll(item, now);
    });

    this.scheduleNextTick();
  }

  private scheduleNextTick(): void {
    if (!this.shouldContinue()) {
      this.state.timer = null;
      return;
    }

    const nextDue = this.getNextDueTime();
    const delay = Math.max(nextDue - Date.now(), MIN_TICK_MS);

    this.state.timer = setTimeout(() => {
      this.state.timer = null;
      this.tick();
    }, delay);
  }

  private shouldContinue(): boolean {
    if (this.itemCache.length === 0) return false;
    if (this.state.activeConnections > 0) return true;
    return this.state.idleMode && getEnvValue("IDLE_POLLING_ENABLED");
  }

  private isDue(item: PollingItem, now: number): boolean {
    if (this.running.has(item.id)) return false;
    return now >= item.lastPolledAt + this.getEffectiveInterval(item);
  }

  private getNextDueTime(): number {
    const now = Date.now();
    let nextDue = Infinity;

    for (const item of this.itemCache) {
      const interval = this.getEffectiveInterval(item);
      const dueAt = item.lastPolledAt + interval;

      if (this.running.has(item.id)) {
        // A long-running poll should not force the scheduler into a tight loop.
        // Schedule next check for when the current poll would be due.
        const runningDueAt = Math.max(dueAt, now + interval);
        nextDue = Math.min(nextDue, runningDueAt);
      } else {
        nextDue = Math.min(nextDue, dueAt);
      }
    }

    return nextDue;
  }

  private getEffectiveInterval(item: PollingItem): number {
    if (!this.state.idleMode) return item.pollingMs;

    const idleInterval = IDLE_POLLING_MS();
    return Math.max(item.pollingMs, idleInterval);
  }

  private async executePoll(item: PollingItem, now: number): Promise<void> {
    if (this.running.has(item.id)) return;

    this.running.add(item.id);
    item.lastPolledAt = now;

    try {
      await this.runPoll(item);
      item.retryCount = 0;
    } catch (err) {
      console.error(`[polling] Error polling ${item.id}:`, err);
      item.retryCount++;
    } finally {
      this.running.delete(item.id);
    }
  }

  private staggerOverdueItems(items: PollingItem[], now: number): void {
    const overdue = items.filter(
      (item) => now >= item.lastPolledAt + this.getEffectiveInterval(item),
    );

    if (overdue.length <= 1) return;

    overdue.forEach((item, index) => {
      const interval = this.getEffectiveInterval(item);
      const offset = Math.floor(((index + 1) * interval) / (overdue.length + 1));
      item.lastPolledAt = now - interval + offset;
    });
  }

  private async getItems(): Promise<PollingItem[]> {
    const now = Date.now();
    if (now < this.cacheExpiresAt) return this.itemCache;

    try {
      const allItems = await db.select().from(items);

      // Preserve existing item state (lastPolledAt, retryCount)
      const existingMap = new Map(this.itemCache.map((i) => [i.id, i]));

      this.itemCache = allItems
        .filter((item) => item.serviceType || item.href)
        .map((item) => {
          const adapter = item.serviceType ? getService(item.serviceType) : null;
          const existing = existingMap.get(item.id);

          return {
            id: item.id,
            serviceType: item.serviceType,
            href: item.href,
            serviceUrl: item.serviceUrl,
            configEnc: item.configEnc,
            pollingMs: item.pollingMs ?? adapter?.defaultPollingMs ?? 30_000,
            lastPolledAt: existing?.lastPolledAt ?? 0,
            retryCount: existing?.retryCount ?? 0,
          };
        });

      this.cacheExpiresAt = now + 10_000;
      console.log(`[polling] Loaded ${this.itemCache.length} item(s)`);
    } catch (err) {
      console.error("[polling] Failed to load items:", err);
    }

    return this.itemCache;
  }

  private async runPoll(item: PollingItem): Promise<void> {
    if (item.serviceType) {
      await this.pollService(item);
    } else if (item.href) {
      await this.pollUrl(item);
    }
  }

  private async pollService(item: PollingItem): Promise<void> {
    const adapter = item.serviceType ? getService(item.serviceType) : null;
    if (!adapter?.fetchData) return;

    const config = await this.buildConfig(item);
    if (!config) return;

    const data = await adapter.fetchData(config);
    serverCache.set(item.id, { widgetData: data });
  }

  private async pollUrl(item: PollingItem): Promise<void> {
    try {
      const res = await fetchWithTimeout(item.href!, { method: "GET" }, PING_TIMEOUT_MS);

      serverCache.set(item.id, {
        pingStatus: res.ok
          ? { state: "reachable" }
          : { state: "error", reason: `HTTP ${res.status}`, httpStatus: res.status },
      });
    } catch (err) {
      const isTimeout = err instanceof DOMException && err.name === "TimeoutError";
      serverCache.set(item.id, {
        pingStatus: isTimeout
          ? { state: "slow", reason: "Request timed out", timeoutMs: PING_TIMEOUT_MS }
          : { state: "unreachable", reason: "Request failed" },
      });
    }
  }

  private async buildConfig(item: PollingItem): Promise<Record<string, string> | null> {
    const config: Record<string, string> = {};
    if (item.serviceUrl) config.url = item.serviceUrl;

    if (item.configEnc) {
      try {
        const decrypted = JSON.parse(await decrypt(item.configEnc));
        Object.assign(config, decrypted);
      } catch {
        serverCache.set(item.id, {
          widgetData: { _status: "error", _statusText: "Failed to decrypt credentials" },
        });
        return null;
      }
    }

    return config;
  }

  private clearTickTimer(): void {
    if (this.state.timer) {
      clearTimeout(this.state.timer);
      this.state.timer = null;
    }
  }

  private clearGraceTimer(): void {
    if (this.state.graceTimer) {
      clearTimeout(this.state.graceTimer);
      this.state.graceTimer = null;
    }
  }

  getConnectionCount(): number {
    return this.state.activeConnections;
  }
}

export const pollingSup = new PollingSupervisor();
