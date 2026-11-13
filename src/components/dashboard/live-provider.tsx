"use client";

import { createContext, useCallback, useContext, useEffect, useRef, type ReactNode } from "react";
import { liveStore } from "@/lib/live-store";
import { sseEventSchema, type ItemLive } from "@/lib/live-types";

declare global {
  interface Window {
    __sseOpenCount?: number;
  }
}

/** Close live updates this long after the tab is hidden (quick tab switches keep them). */
const HIDDEN_PAUSE_MS = 30_000;
/** Close live updates when a visible tab has had no input for this long. */
const IDLE_PAUSE_MS = 15 * 60_000;
const IDLE_CHECK_MS = 60_000;
const ACTIVITY_EVENTS = [
  "pointerdown",
  "pointermove",
  "keydown",
  "wheel",
  "touchstart",
  "scroll",
  "focus",
] as const;

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
  // Stable getter for useSyncExternalStore's third argument
  const snapshotRef = useRef(initialSnapshotById);
  const getServerSnapshot = useCallback((id: string) => snapshotRef.current[id] ?? null, []);

  // Hydration reads the server snapshot; reconciliation notifies mounted tiles
  // after commit, never while another component is rendering.
  useEffect(() => {
    snapshotRef.current = initialSnapshotById;
    liveStore.initOnce(initialSnapshotById, snapshotKey);
  }, [initialSnapshotById, snapshotKey]);

  useEffect(() => {
    if (!enableSse) return;

    let attempt = 0;
    let es: EventSource | null = null;
    let reconnectTimer: ReturnType<typeof setTimeout> | undefined;
    let hiddenTimer: ReturnType<typeof setTimeout> | undefined;
    let paused = false;
    let wasHidden = document.visibilityState === "hidden";
    let lastActivityAt = Date.now();

    function closeConnection() {
      clearTimeout(reconnectTimer);
      reconnectTimer = undefined;
      es?.close();
      es = null;
    }

    function scheduleReconnect() {
      if (paused) return;
      const delay = Math.min(1000 * 2 ** attempt, 30000) + Math.random() * 1000;
      attempt++;
      reconnectTimer = setTimeout(connect, delay);
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
          closeConnection();
          liveStore.setSseState("disconnected");
          scheduleReconnect();
        } else if (event.data.type === "poll-state") {
          liveStore.updatePollState(event.data);
        } else if (event.data.type === "update") {
          liveStore.updateFromSse(event.data.itemId, event.data);
          liveStore.touchLastUpdate(event.data.fetchedAt);
        }
      };

      es.onerror = () => {
        closeConnection();
        liveStore.setSseState("disconnected");
        scheduleReconnect();
      };
    }

    // The server polls at configured rates only while a dashboard is connected, so a
    // tab nobody is looking at must not hold the connection open.
    function pause() {
      if (paused) return;
      paused = true;
      closeConnection();
      liveStore.setSseState("paused");
    }

    function resume() {
      paused = false;
      closeConnection();
      attempt = 0;
      connect();
    }

    // Browsers can suspend an SSE socket while backgrounded without changing
    // readyState from OPEN. Replace it on resume instead of trusting that state.
    function onVisibilityChange() {
      if (document.visibilityState === "hidden") {
        wasHidden = true;
        clearTimeout(hiddenTimer);
        hiddenTimer = setTimeout(pause, HIDDEN_PAUSE_MS);
        return;
      }
      clearTimeout(hiddenTimer);
      lastActivityAt = Date.now();
      if (!wasHidden && !paused) return;
      wasHidden = false;
      resume();
    }

    function onActivity() {
      lastActivityAt = Date.now();
      if (paused && document.visibilityState === "visible") resume();
    }

    const idleCheck = setInterval(() => {
      if (!paused && Date.now() - lastActivityAt >= IDLE_PAUSE_MS) pause();
    }, IDLE_CHECK_MS);

    document.addEventListener("visibilitychange", onVisibilityChange);
    for (const type of ACTIVITY_EVENTS)
      window.addEventListener(type, onActivity, { capture: true, passive: true });

    if (document.visibilityState === "hidden") pause();
    else connect();

    return () => {
      closeConnection();
      clearTimeout(hiddenTimer);
      clearInterval(idleCheck);
      document.removeEventListener("visibilitychange", onVisibilityChange);
      for (const type of ACTIVITY_EVENTS)
        window.removeEventListener(type, onActivity, { capture: true });
    };
  }, [enableSse]);

  return (
    <ServerSnapshotContext.Provider value={getServerSnapshot}>
      {children}
    </ServerSnapshotContext.Provider>
  );
}
