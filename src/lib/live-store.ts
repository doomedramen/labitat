import type { ServiceData, ServiceStatus } from "@/lib/adapters/types";
import type { ItemLive, PollSchedule } from "@/lib/live-types";

export type MetaState = {
  sseState: "connecting" | "connected" | "disconnected";
  lastUpdateAt: number | null;
};

type SseUpdate = {
  widgetData: ServiceData | null;
  pingStatus: ServiceStatus | null;
  fetchedAt: number;
  configurationRevision?: number | null;
  observationUpdatedAt?: number | null;
  lastAttemptAt?: number | null;
  lastSuccessAt?: number | null;
  freshness?: ItemLive["freshness"];
};

const emptyItemLive = (configurationRevision: number | null = null): ItemLive => ({
  widgetData: null,
  pingStatus: null,
  configurationRevision,
  observationUpdatedAt: null,
  lastAttemptAt: null,
  lastSuccessAt: null,
  freshness: "unknown",
  lastFetchedAt: null,
  itemLastUpdateAt: null,
});

let stateById: Record<string, ItemLive> = {};
let knownIds = new Set<string>();
let snapshotKey: string | null = null;
const itemListeners = new Map<string, Set<() => void>>();
let scheduleById: Record<string, PollSchedule> = {};

let metaState: MetaState = { sseState: "connecting", lastUpdateAt: null };
const metaListeners = new Set<() => void>();

function observationTime(item: ItemLive): number | null {
  return item.observationUpdatedAt ?? item.lastFetchedAt ?? item.itemLastUpdateAt;
}

function generationRelation(
  incoming: number | null,
  current: number | null,
): "older" | "same" | "newer" | "unknown" {
  if (incoming === null && current === null) return "same";
  if (incoming === null) return "unknown";
  if (current === null) return "newer";
  if (incoming < current) return "older";
  if (incoming > current) return "newer";
  return "same";
}

function shouldUseIncoming(incoming: ItemLive, current: ItemLive | undefined): boolean {
  if (!current) return true;

  const relation = generationRelation(
    incoming.configurationRevision,
    current.configurationRevision,
  );
  if (relation === "older") return false;
  if (relation === "newer") return true;

  const incomingAt = observationTime(incoming);
  const currentAt = observationTime(current);
  if (incomingAt === null) return currentAt === null;
  if (currentAt === null) return true;
  return incomingAt >= currentAt;
}

function normalizeSnapshot(item: ItemLive): ItemLive {
  return {
    ...emptyItemLive(item.configurationRevision ?? null),
    ...item,
    configurationRevision: item.configurationRevision ?? null,
    observationUpdatedAt: item.observationUpdatedAt ?? item.lastFetchedAt ?? null,
    lastFetchedAt: item.lastFetchedAt ?? item.observationUpdatedAt ?? null,
    freshness: item.freshness ?? "unknown",
  };
}

function notifyItem(itemId: string) {
  itemListeners.get(itemId)?.forEach((cb) => cb());
}

export const liveStore = {
  /**
   * Reconcile a server snapshot without throwing away newer live observations
   * or listeners for items that remain mounted. Kept under the old name so
   * existing callers and Strict Mode tests retain the same entry point.
   */
  initOnce(snapshot: Record<string, ItemLive>, key: string) {
    const previousIds = new Set(Object.keys(stateById));
    const nextState: Record<string, ItemLive> = {};
    const changedIds = new Set<string>();

    for (const [itemId, rawIncoming] of Object.entries(snapshot)) {
      const incoming = normalizeSnapshot(rawIncoming);
      const current = stateById[itemId];
      if (shouldUseIncoming(incoming, current)) {
        nextState[itemId] = incoming;
        if (current && JSON.stringify(current) !== JSON.stringify(incoming)) {
          changedIds.add(itemId);
        } else if (!current) {
          changedIds.add(itemId);
        }
      } else if (current) {
        nextState[itemId] = current;
      } else {
        nextState[itemId] = incoming;
        changedIds.add(itemId);
      }
      previousIds.delete(itemId);
    }

    // Deleted items leave live state but do not invalidate surviving listeners.
    for (const removedId of previousIds) {
      changedIds.add(removedId);
      delete scheduleById[removedId];
    }

    stateById = nextState;
    knownIds = new Set(Object.keys(nextState));
    snapshotKey = key;

    for (const itemId of changedIds) notifyItem(itemId);
  },

  subscribeItem(itemId: string, cb: () => void): () => void {
    if (!itemListeners.has(itemId)) itemListeners.set(itemId, new Set());
    itemListeners.get(itemId)!.add(cb);
    return () => {
      const listeners = itemListeners.get(itemId);
      listeners?.delete(cb);
      if (listeners?.size === 0) itemListeners.delete(itemId);
    };
  },

  getSnapshot(itemId: string): ItemLive | null {
    return stateById[itemId] ?? null;
  },

  updateFromSse(itemId: string, data: SseUpdate) {
    if (!knownIds.has(itemId)) return;

    const current = stateById[itemId] ?? emptyItemLive(data.configurationRevision ?? null);
    const isLegacy =
      data.configurationRevision === undefined &&
      data.observationUpdatedAt === undefined &&
      data.lastAttemptAt === undefined &&
      data.lastSuccessAt === undefined &&
      data.freshness === undefined;
    const candidate: ItemLive = {
      ...current,
      widgetData: data.widgetData,
      pingStatus: data.pingStatus,
      configurationRevision: data.configurationRevision ?? current.configurationRevision,
      observationUpdatedAt: data.observationUpdatedAt ?? data.fetchedAt,
      lastAttemptAt: data.lastAttemptAt ?? current.lastAttemptAt,
      lastSuccessAt: data.lastSuccessAt ?? current.lastSuccessAt,
      freshness: isLegacy ? "unknown" : (data.freshness ?? current.freshness),
      lastFetchedAt: data.fetchedAt,
      itemLastUpdateAt: data.observationUpdatedAt ?? data.fetchedAt,
    };

    if (!shouldUseIncoming(candidate, current)) return;

    stateById = { ...stateById, [itemId]: candidate };
    notifyItem(itemId);
  },

  updatePollState(schedule: PollSchedule) {
    if (!knownIds.has(schedule.itemId)) return;
    scheduleById = { ...scheduleById, [schedule.itemId]: schedule };
    notifyItem(schedule.itemId);
  },

  getPollState(itemId: string): PollSchedule | null {
    return scheduleById[itemId] ?? null;
  },

  setSseState(next: MetaState["sseState"]) {
    if (metaState.sseState === next) return;
    metaState = { ...metaState, sseState: next };
    metaListeners.forEach((cb) => cb());
  },

  touchLastUpdate(fetchedAt: number) {
    metaState = { ...metaState, lastUpdateAt: fetchedAt };
    metaListeners.forEach((cb) => cb());
  },

  subscribeMeta(cb: () => void): () => void {
    metaListeners.add(cb);
    return () => metaListeners.delete(cb);
  },

  getMeta(): MetaState {
    return metaState;
  },

  /** Test-only inspection hook; production callers should use initOnce. */
  getSnapshotKey(): string | null {
    return snapshotKey;
  },
};
