"use client";

import { useCallback, useSyncExternalStore } from "react";
import { liveStore, type MetaState } from "@/lib/live-store";
import type { ItemLive } from "@/lib/live-types";
import { useServerSnapshot } from "@/components/dashboard/live-provider";

export function useItemLive(itemId: string): ItemLive | null {
  const getServerSnapshot = useServerSnapshot();

  const subscribe = useCallback((cb: () => void) => liveStore.subscribeItem(itemId, cb), [itemId]);
  const getSnapshot = useCallback(() => liveStore.getSnapshot(itemId), [itemId]);

  return useSyncExternalStore(subscribe, getSnapshot, () => getServerSnapshot(itemId));
}

export function useLiveMeta(): MetaState {
  const subscribe = useCallback((cb: () => void) => liveStore.subscribeMeta(cb), []);
  const getSnapshot = useCallback(() => liveStore.getMeta(), []);

  // Meta has no SSR hydration value — return safe default
  return useSyncExternalStore(subscribe, getSnapshot, () => ({
    sseState: "connecting" as const,
    lastUpdateAt: null,
  }));
}
