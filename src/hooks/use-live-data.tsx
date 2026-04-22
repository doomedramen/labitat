"use client";

import { useCallback, useEffect, useRef, useSyncExternalStore, type ReactNode } from "react";
import type { ServiceData, ServiceStatus } from "@/lib/adapters/types";

// ── Types ──────────────────────────────────────────────────────────────────────

interface LiveDataEntry {
  widgetData: ServiceData | null;
  pingStatus: ServiceStatus | null;
}

export type SseState = "connected" | "disconnected";

// ── Module-level store (used by useSyncExternalStore) ───────────────────────────

const DEFAULT_ENTRY: LiveDataEntry = { widgetData: null, pingStatus: null };

class LiveDataStore {
  private cache = new Map<string, LiveDataEntry>();
  private listeners = new Set<() => void>();
  private _sseState: SseState = "disconnected";
  private sseListeners = new Set<() => void>();
  private _lastUpdateAt: number = 0;
  private lastUpdateListeners = new Set<() => void>();
  private itemLastUpdateAt = new Map<string, number>();
  private itemUpdateListeners = new Map<string, Set<() => void>>();

  get(itemId: string): LiveDataEntry {
    return this.cache.get(itemId) ?? DEFAULT_ENTRY;
  }

  set(itemId: string, data: LiveDataEntry, fromCache = false): void {
    this.cache.set(itemId, data);
    // Only update timestamps for real updates, not cache snapshots
    if (!fromCache) {
      this._lastUpdateAt = Date.now();
      this.itemLastUpdateAt.set(itemId, Date.now());
    }
    for (const l of this.listeners) {
      try {
        l();
      } catch {
        /* listener removed mid-iteration */
      }
    }
    // Only notify progress listeners for real updates
    if (!fromCache) {
      for (const l of this.lastUpdateListeners) {
        try {
          l();
        } catch {
          /* listener removed mid-iteration */
        }
      }
    }
    // Notify item-specific listeners (only for real updates)
    if (!fromCache) {
      const itemListeners = this.itemUpdateListeners.get(itemId);
      if (itemListeners) {
        for (const l of itemListeners) {
          try {
            l();
          } catch {
            /* listener removed mid-iteration */
          }
        }
      }
    }
  }

  get sseState(): SseState {
    return this._sseState;
  }

  setSseState(state: SseState): void {
    if (this._sseState === state) return;
    this._sseState = state;
    for (const l of this.sseListeners) {
      try {
        l();
      } catch {
        /* listener removed mid-iteration */
      }
    }
  }

  get lastUpdateAt(): number {
    return this._lastUpdateAt;
  }

  touchLastUpdate(): void {
    this._lastUpdateAt = Date.now();
    for (const l of this.lastUpdateListeners) {
      try {
        l();
      } catch {
        /* listener removed mid-iteration */
      }
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener);
    return () => {
      this.listeners.delete(listener);
    };
  };

  subscribeSse = (listener: () => void): (() => void) => {
    this.sseListeners.add(listener);
    return () => {
      this.sseListeners.delete(listener);
    };
  };

  subscribeLastUpdate = (listener: () => void): (() => void) => {
    this.lastUpdateListeners.add(listener);
    return () => {
      this.lastUpdateListeners.delete(listener);
    };
  };

  getItemLastUpdateAt(itemId: string): number {
    return this.itemLastUpdateAt.get(itemId) ?? 0;
  }

  subscribeItemUpdate(itemId: string, listener: () => void): () => void {
    if (!this.itemUpdateListeners.has(itemId)) {
      this.itemUpdateListeners.set(itemId, new Set());
    }
    this.itemUpdateListeners.get(itemId)!.add(listener);
    return () => {
      this.itemUpdateListeners.get(itemId)?.delete(listener);
    };
  }
}

const liveDataStore = new LiveDataStore();

// ── Hooks ──────────────────────────────────────────────────────────────────────

/**
 * Subscribe to live data for a specific item.
 * Only re-renders when that item's data changes.
 */
export function useLiveDataEntry(itemId: string): LiveDataEntry {
  return useSyncExternalStore(
    liveDataStore.subscribe,
    () => liveDataStore.get(itemId),
    () => DEFAULT_ENTRY, // server snapshot — no live data during SSR
  );
}

/**
 * Subscribe to SSE connection state.
 */
export function useSseState(): SseState {
  return useSyncExternalStore(
    liveDataStore.subscribeSse,
    () => liveDataStore.sseState,
    () => "disconnected" as SseState, // server snapshot — SSE is client-only
  );
}

/**
 * Subscribe to last data update timestamp.
 */
export function useLastUpdateAt(): number {
  return useSyncExternalStore(
    liveDataStore.subscribeLastUpdate,
    () => liveDataStore.lastUpdateAt,
    () => 0, // server snapshot — no updates during SSR
  );
}

/**
 * Subscribe to per-item last update timestamp.
 * Returns the timestamp when this specific item was last updated via SSE.
 */
export function useItemLastUpdateAt(itemId: string): number {
  return useSyncExternalStore(
    (listener) => liveDataStore.subscribeItemUpdate(itemId, listener),
    () => liveDataStore.getItemLastUpdateAt(itemId),
    () => 0, // server snapshot — no updates during SSR
  );
}

// ── Provider (manages SSE connection lifecycle) ────────────────────────────────

const MAX_BACKOFF = 30_000;

interface SseMessage {
  type: string;
  itemId?: string;
  widgetData?: ServiceData | null;
  pingStatus?: ServiceStatus | null;
  fromCache?: boolean;
}

/**
 * Provider that opens a single SSE connection to /api/events
 * and writes updates to the module-level LiveDataStore.
 */
export function LiveDataProvider({ children }: { children: ReactNode }) {
  const esRef = useRef<EventSource | null>(null);
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
  const connectRef = useRef<(() => void) | null>(null);
  const backoffRef = useRef(1000);

  const scheduleReconnect = useCallback((delay: number) => {
    if (reconnectTimerRef.current) {
      clearTimeout(reconnectTimerRef.current);
    }
    liveDataStore.setSseState("disconnected");
    reconnectTimerRef.current = setTimeout(() => {
      reconnectTimerRef.current = null;
      connectRef.current?.();
    }, delay);
  }, []);

  const doConnect = useCallback(() => {
    if (typeof window === "undefined") return;
    if (
      esRef.current?.readyState === EventSource.CONNECTING ||
      esRef.current?.readyState === EventSource.OPEN
    ) {
      return;
    }

    const es = new EventSource("/api/events");
    esRef.current = es;

    es.onopen = () => {
      backoffRef.current = 1000;
      liveDataStore.setSseState("connected");
      // Set initial last update time when connecting (if not already set)
      if (liveDataStore.lastUpdateAt === 0) {
        liveDataStore.touchLastUpdate();
      }
    };

    es.onmessage = (event) => {
      try {
        const msg: SseMessage = JSON.parse(event.data);
        if (msg.type === "reconnect") {
          // Server requested a clean reconnect without waiting for EventSource.onerror.
          es.close();
          esRef.current = null;
          scheduleReconnect(backoffRef.current);
          return;
        }
        if (msg.type === "update" && msg.itemId) {
          // console.log(
          //   `[${new Date().toISOString()}] [live-data] Received update for ${msg.itemId}:`,
          //   msg.pingStatus?.state ?? "no pingStatus",
          //   msg.fromCache ? "(from cache)" : "(fresh)",
          // );
          liveDataStore.set(
            msg.itemId,
            {
              widgetData: msg.widgetData ?? null,
              pingStatus: msg.pingStatus ?? null,
            },
            msg.fromCache,
          );
        }
      } catch {
        // ignore malformed messages
      }
    };

    es.onerror = () => {
      es.close();
      const delay = backoffRef.current;
      backoffRef.current = Math.min(delay * 2, MAX_BACKOFF);
      esRef.current = null;
      scheduleReconnect(delay);
    };
  }, [scheduleReconnect]);

  useEffect(() => {
    connectRef.current = doConnect;
  }, [doConnect]);

  useEffect(() => {
    doConnect();
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current);
        reconnectTimerRef.current = null;
      }
      if (esRef.current) {
        esRef.current.close();
        esRef.current = null;
      }
      liveDataStore.setSseState("disconnected");
    };
  }, [doConnect]);

  return <>{children}</>;
}
