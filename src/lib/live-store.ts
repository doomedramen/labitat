import type { ServiceData, ServiceStatus } from "@/lib/adapters/types";
import type { ItemLive } from "@/lib/live-types";

export type MetaState = {
  sseState: "connecting" | "connected" | "disconnected";
  lastUpdateAt: number | null;
};

// Module-level state (survives re-renders, reset only on new snapshotKey)
let stateById: Record<string, ItemLive> = {};
let knownIds = new Set<string>();
let snapshotKey: string | null = null;
const itemListeners = new Map<string, Set<() => void>>();

let metaState: MetaState = { sseState: "connecting", lastUpdateAt: null };
const metaListeners = new Set<() => void>();

export const liveStore = {
  // Guard: no-ops if key matches (safe across StrictMode remounts)
  initOnce(snapshot: Record<string, ItemLive>, key: string) {
    if (snapshotKey === key) return;
    stateById = snapshot;
    knownIds = new Set(Object.keys(snapshot));
    snapshotKey = key;
    metaState = { sseState: "connecting", lastUpdateAt: null };
    itemListeners.clear();
  },

  subscribeItem(itemId: string, cb: () => void): () => void {
    if (!itemListeners.has(itemId)) itemListeners.set(itemId, new Set());
    itemListeners.get(itemId)!.add(cb);
    return () => itemListeners.get(itemId)?.delete(cb);
  },

  getSnapshot(itemId: string): ItemLive | null {
    return stateById[itemId] ?? null;
  },

  // fetchedAt comes from the server payload, never Date.now()
  updateFromSse(
    itemId: string,
    data: {
      widgetData: ServiceData | null;
      pingStatus: ServiceStatus | null;
      fetchedAt: number; // server-stamped
    },
  ) {
    if (!knownIds.has(itemId)) return;
    stateById = {
      ...stateById,
      [itemId]: {
        ...(stateById[itemId] ?? {
          widgetData: null,
          pingStatus: null,
          lastFetchedAt: null,
          itemLastUpdateAt: null,
        }),
        widgetData: data.widgetData,
        pingStatus: data.pingStatus,
        lastFetchedAt: data.fetchedAt,
        itemLastUpdateAt: data.fetchedAt,
      },
    };
    itemListeners.get(itemId)?.forEach((cb) => cb());
  },

  setSseState(next: MetaState["sseState"]) {
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
};
