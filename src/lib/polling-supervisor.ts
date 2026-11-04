import { serviceFailureReason } from "@/lib/service-failure";
import { db } from "@/lib/db";
import { items, groups } from "@/lib/db/schema";
import { decrypt } from "@/lib/crypto";
import { getService } from "@/lib/adapters";
import { fetchWithTimeout } from "@/lib/adapters/fetch-with-timeout";
import { serverCache } from "./server-cache";
import { isCurrentConfiguration, saveServiceObservation } from "./service-observation";
import { env } from "@/lib/env";

// Environment defaults - extracted for clarity and testability
const ENV_DEFAULTS = {
  IDLE_POLLING_ENABLED: true,
  IDLE_POLLING_INTERVAL_MINUTES: 5,
} as const;

// Get env values safely with defaults
function getEnvValue<T extends keyof typeof ENV_DEFAULTS>(key: T): (typeof ENV_DEFAULTS)[T] {
  try {
    switch (key) {
      case "IDLE_POLLING_ENABLED":
        return env.IDLE_POLLING_ENABLED as never;
      case "IDLE_POLLING_INTERVAL_MINUTES":
        return env.IDLE_POLLING_INTERVAL_MINUTES as never;
      default:
        return ENV_DEFAULTS[key];
    }
  } catch {
    return ENV_DEFAULTS[key];
  }
}

const GRACE_PERIOD_MS = 5 * 60 * 1000;
const PING_TIMEOUT_MS = () => {
  try {
    return env.SERVICE_POLLING_TIMEOUT;
  } catch {
    return 10_000;
  }
};
const MIN_TICK_MS = 100;
const MAX_CONCURRENT_POLLS = 15;
const IDLE_POLLING_MS = () => getEnvValue("IDLE_POLLING_INTERVAL_MINUTES") * 60 * 1000;

type PollingItem = {
  id: string;
  serviceType: string | null;
  href: string | null;
  serviceUrl: string | null;
  configEnc: string | null;
  config: Record<string, string> | null;
  pollingMs: number;
  configurationRevision: number;
  lastPolledAt: number;
  retryCount: number;
  _groupOrder: number;
  _itemOrder: number;
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
  private backgroundEnabled = false;
  private maintenance: (() => void) | undefined;
  private enabled = false;
  private tickPromise: Promise<void> | null = null;

  startBackground(maintenance?: () => void): void {
    if (this.backgroundEnabled) return;
    this.backgroundEnabled = true;
    this.maintenance = maintenance;
    this.state.idleMode = this.state.activeConnections === 0;
    this.start();
  }

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

    if (this.state.activeConnections === 0 && this.backgroundEnabled) {
      this.state.idleMode = true;
      void this.pollNow();
    } else if (this.state.activeConnections === 0) {
      this.state.graceTimer = setTimeout(() => {
        this.enterIdleMode();
      }, GRACE_PERIOD_MS);
    }
  }

  pollNow(): Promise<void> {
    if (this.tickPromise) return this.tickPromise;
    this.clearTickTimer();
    this.tickPromise = this.performTick().finally(() => {
      this.tickPromise = null;
      this.scheduleNextTick();
    });
    return this.tickPromise;
  }

  private async performTick(): Promise<void> {
    this.maintenance?.();
    const items = await this.getItems();
    const now = Date.now();
    for (const item of items.filter((item) => this.isDue(item, now))) {
      if (this.running.size >= MAX_CONCURRENT_POLLS) break;
      void this.executePoll(item, now);
    }
  }

  stop(): void {
    this.backgroundEnabled = false;
    this.maintenance = undefined;
    this.enabled = false;
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
    this.enabled = true;
    if (this.state.timer || this.tickPromise) return;
    this.hasStartedOnce = true;
    console.log("[polling] Supervisor started");
    void this.tick().catch((error) => console.error("[polling] Scheduler failed", error));
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
    void this.tick().catch((error) => console.error("[polling] Scheduler failed", error));
  }

  private exitIdleMode(): void {
    if (!this.state.idleMode) return;

    this.state.idleMode = false;
    console.log("[polling] Exiting idle mode");

    this.pollNow().catch(console.error);
  }

  private tick(): Promise<void> {
    return this.pollNow();
  }

  private scheduleNextTick(): void {
    this.clearTickTimer();
    if (!this.shouldContinue()) {
      this.state.timer = null;
      return;
    }

    const nextDue = this.itemCache.length ? this.getNextDueTime() : Date.now() + 10000;
    const delay = Math.max(
      Math.min(nextDue - Date.now(), this.backgroundEnabled ? 60_000 : Infinity),
      MIN_TICK_MS,
    );

    this.state.timer = setTimeout(() => {
      this.state.timer = null;
      void this.tick().catch((error) => console.error("[polling] Scheduler failed", error));
    }, delay);
  }

  private shouldContinue(): boolean {
    if (!this.enabled) return false;
    if (this.backgroundEnabled) return true;
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

    const idleInterval = this.backgroundEnabled ? 60_000 : IDLE_POLLING_MS();
    return Math.max(item.pollingMs, idleInterval);
  }

  private async executePoll(item: PollingItem, now: number): Promise<void> {
    if (this.running.has(item.id)) return;

    this.running.add(item.id);
    item.lastPolledAt = now;

    try {
      await this.runPoll(item);
      item.retryCount = 0;
    } catch (error) {
      this.recordServiceFailure(item, error);
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

    // Spread overdue items over a short window to avoid a spike,
    // but keep it short so the UI feels responsive on load.
    const STAGGER_WINDOW_MS = 2000;
    const step = STAGGER_WINDOW_MS / (overdue.length + 1);

    overdue.forEach((item, index) => {
      const interval = this.getEffectiveInterval(item);
      // item is due at: lastPolledAt + interval
      // we want it due at: now + ((index + 1) * step)
      item.lastPolledAt = now + (index + 1) * step - interval;
    });
  }

  private async getItems(): Promise<PollingItem[]> {
    const now = Date.now();
    if (now < this.cacheExpiresAt) return this.itemCache;

    try {
      const allGroups = await db.select().from(groups);
      const allItems = await db.select().from(items);

      const groupMap = new Map(allGroups.map((g) => [g.id, g]));

      // Preserve existing item state (lastPolledAt, retryCount, config)
      const existingMap = new Map(this.itemCache.map((i) => [i.id, i]));

      const nextItems: PollingItem[] = [];
      for (const item of allItems) {
        if (!item.serviceType && !item.href) continue;

        const adapter = item.serviceType ? getService(item.serviceType) : null;
        if (adapter?.clientSide) continue;
        const prior = existingMap.get(item.id);
        const existing =
          prior?.configurationRevision === item.configurationRevision ? prior : undefined;

        let config: Record<string, string> | null = existing?.config ?? null;

        // Decrict only if the encrypted config changed or we don't have it yet
        if (item.configEnc && (!existing || existing.configEnc !== item.configEnc)) {
          try {
            config = JSON.parse(await decrypt(item.configEnc));
          } catch {
            console.warn(`[polling] Failed to decrypt config for item ${item.id}`);
            config = null;
          }
        } else if (!item.configEnc) {
          config = null;
        }

        const group = groupMap.get(item.groupId);

        nextItems.push({
          id: item.id,
          configurationRevision: item.configurationRevision,
          serviceType: item.serviceType,
          href: item.href,
          serviceUrl: item.serviceUrl,
          configEnc: item.configEnc,
          config,
          pollingMs: item.pollingMs ?? adapter?.defaultPollingMs ?? 30_000,
          lastPolledAt: existing?.lastPolledAt ?? 0,
          retryCount: existing?.retryCount ?? 0,
          // Sort helper fields
          _groupOrder: group?.order ?? 999,
          _itemOrder: item.order ?? 999,
        });
      }

      // Sort items by group order then item order (top to bottom)
      nextItems.sort((a, b) => {
        if (a._groupOrder !== b._groupOrder) return a._groupOrder - b._groupOrder;
        return a._itemOrder - b._itemOrder;
      });

      this.itemCache = nextItems;

      // Stagger if this is the first load or we have many items
      if (this.cacheExpiresAt === 0 || this.shouldStaggerOnNextStart) {
        this.staggerOverdueItems(this.itemCache, now);
        this.shouldStaggerOnNextStart = false;
      }

      this.cacheExpiresAt = now + 10_000;
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

    const config = this.buildConfig(item);
    if (!config) return;

    const data = await adapter.fetchData(config);
    saveServiceObservation(item.id, item.configurationRevision, item.lastPolledAt, {
      ...data,
      _status: data._status ?? "ok",
    });
  }

  private recordServiceFailure(item: PollingItem, error: unknown): void {
    saveServiceObservation(item.id, item.configurationRevision, item.lastPolledAt, {
      _status: "error",
      _statusText: serviceFailureReason(error),
    });
  }

  private async pollUrl(item: PollingItem): Promise<void> {
    try {
      const res = await fetchWithTimeout(item.href!, { method: "GET" }, PING_TIMEOUT_MS());

      if (!isCurrentConfiguration(item.id, item.configurationRevision)) return;
      serverCache.set(
        item.id,
        {
          pingStatus: res.ok
            ? { state: "reachable" }
            : { state: "error", reason: `HTTP ${res.status}`, httpStatus: res.status },
        },
        {
          successful: res.ok,
          attemptAt: item.lastPolledAt,
          configurationRevision: item.configurationRevision,
        },
      );
    } catch (err) {
      if (!isCurrentConfiguration(item.id, item.configurationRevision)) return;
      const isTimeout = err instanceof DOMException && err.name === "TimeoutError";
      serverCache.set(
        item.id,
        {
          pingStatus: isTimeout
            ? { state: "slow", reason: "Request timed out", timeoutMs: PING_TIMEOUT_MS() }
            : { state: "unreachable", reason: "Request failed" },
        },
        {
          successful: false,
          attemptAt: item.lastPolledAt,
          configurationRevision: item.configurationRevision,
        },
      );
    }
  }

  private buildConfig(item: PollingItem): Record<string, string> | null {
    const config: Record<string, string> = {};
    if (item.serviceUrl) config.url = item.serviceUrl;

    if (item.config) {
      Object.assign(config, item.config);
    } else if (item.configEnc) {
      // Fallback: if decryption failed during load, we can't poll this service.
      this.recordServiceFailure(item, new Error("Credentials unavailable"));
      return null;
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

const globalPolling = globalThis as typeof globalThis & { __labitatPolling?: PollingSupervisor };
export const pollingSup =
  process.env.NODE_ENV === "test"
    ? new PollingSupervisor()
    : (globalPolling.__labitatPolling ??= new PollingSupervisor());
