"use client";

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  type ReactNode,
} from "react";
import { liveStore } from "@/lib/live-store";
import { sseEventSchema, type ItemLive } from "@/lib/live-types";

declare global {
  interface Window {
    __sseOpenCount?: number;
  }
}

// getServerSnapshot context: holds only a stable getter, not the snapshot object
const ServerSnapshotContext = createContext<(id: string) => ItemLive | null>(() => null);

export function useServerSnapshot() {
  return useContext(ServerSnapshotContext);
}

export function LiveProvider({
  initialSnapshotById,
  snapshotKey,
  enableSse,
  children,
}: {
  initialSnapshotById: Record<string, ItemLive>;
  snapshotKey: string;
  enableSse: boolean;
  children: ReactNode;
}) {
  // initOnce in useMemo with client guard — safe, runs once, before any
  // child useSyncExternalStore reads getSnapshot during hydration
  useMemo(() => {
    if (typeof window === "undefined") return;
    liveStore.initOnce(initialSnapshotById, snapshotKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps -- re-init only when snapshotKey changes
  }, [snapshotKey]);

  // Stable getter for useSyncExternalStore's third argument
  const snapshotRef = useRef(initialSnapshotById);
  const getServerSnapshot = useCallback((id: string) => snapshotRef.current[id] ?? null, []);

  useEffect(() => {
    if (!enableSse) return;

    let attempt = 0;
    let es: EventSource | null = null;
    let timeoutId: ReturnType<typeof setTimeout> | undefined;

    function scheduleReconnect() {
      const delay = Math.min(1000 * 2 ** attempt, 30000) + Math.random() * 1000;
      attempt++;
      timeoutId = setTimeout(connect, delay);
    }

    function connect() {
      if (process.env.NODE_ENV !== "production") {
        window.__sseOpenCount = (window.__sseOpenCount ?? 0) + 1;
      }

      es = new EventSource("/api/events");
      liveStore.setSseState("connecting");

      es.onopen = () => {
        attempt = 0;
        liveStore.setSseState("connected");
      };

      es.onmessage = (e) => {
        let parsed: unknown;
        try {
          parsed = JSON.parse(e.data);
        } catch {
          return;
        }

        const event = sseEventSchema.safeParse(parsed);
        if (!event.success) return;

        if (event.data.type === "reconnect") {
          es?.close();
          scheduleReconnect();
        } else if (event.data.type === "update") {
          liveStore.updateFromSse(event.data.itemId, event.data);
          liveStore.touchLastUpdate(event.data.fetchedAt);
        }
      };

      es.onerror = () => {
        es?.close();
        liveStore.setSseState("disconnected");
        scheduleReconnect();
      };
    }

    // Reconnect when tab becomes visible again
    function onVisibilityChange() {
      if (document.visibilityState === "visible" && (!es || es.readyState === EventSource.CLOSED)) {
        if (timeoutId) clearTimeout(timeoutId);
        attempt = 0;
        connect();
      }
    }

    document.addEventListener("visibilitychange", onVisibilityChange);
    connect();

    return () => {
      es?.close();
      if (timeoutId) clearTimeout(timeoutId);
      document.removeEventListener("visibilitychange", onVisibilityChange);
    };
  }, [enableSse]);

  return (
    <ServerSnapshotContext.Provider value={getServerSnapshot}>
      {children}
    </ServerSnapshotContext.Provider>
  );
}
