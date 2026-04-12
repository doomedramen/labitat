"use client"

import {
  useCallback,
  useEffect,
  useRef,
  useSyncExternalStore,
  type ReactNode,
} from "react"
import type { ServiceData, ServiceStatus } from "@/lib/adapters/types"

// ── Types ──────────────────────────────────────────────────────────────────────

interface LiveDataEntry {
  widgetData: ServiceData | null
  pingStatus: ServiceStatus | null
}

export type SseState = "connected" | "disconnected"

// ── Module-level store (used by useSyncExternalStore) ───────────────────────────

const DEFAULT_ENTRY: LiveDataEntry = { widgetData: null, pingStatus: null }

class LiveDataStore {
  private cache = new Map<string, LiveDataEntry>()
  private listeners = new Set<() => void>()
  private _sseState: SseState = "disconnected"
  private sseListeners = new Set<() => void>()

  get(itemId: string): LiveDataEntry {
    return this.cache.get(itemId) ?? DEFAULT_ENTRY
  }

  set(itemId: string, data: LiveDataEntry): void {
    this.cache.set(itemId, data)
    for (const l of this.listeners) {
      try {
        l()
      } catch {
        /* listener removed mid-iteration */
      }
    }
  }

  get sseState(): SseState {
    return this._sseState
  }

  setSseState(state: SseState): void {
    if (this._sseState === state) return
    this._sseState = state
    for (const l of this.sseListeners) {
      try {
        l()
      } catch {
        /* listener removed mid-iteration */
      }
    }
  }

  subscribe = (listener: () => void): (() => void) => {
    this.listeners.add(listener)
    return () => {
      this.listeners.delete(listener)
    }
  }

  subscribeSse = (listener: () => void): (() => void) => {
    this.sseListeners.add(listener)
    return () => {
      this.sseListeners.delete(listener)
    }
  }
}

const liveDataStore = new LiveDataStore()

// ── Hooks ──────────────────────────────────────────────────────────────────────

/**
 * Subscribe to live data for a specific item.
 * Only re-renders when that item's data changes.
 */
export function useLiveDataEntry(itemId: string): LiveDataEntry {
  return useSyncExternalStore(liveDataStore.subscribe, () =>
    liveDataStore.get(itemId)
  )
}

/**
 * Subscribe to SSE connection state.
 */
export function useSseState(): SseState {
  return useSyncExternalStore(
    liveDataStore.subscribeSse,
    () => liveDataStore.sseState
  )
}

// ── Provider (manages SSE connection lifecycle) ────────────────────────────────

const MAX_BACKOFF = 30_000

interface SseMessage {
  type: "update"
  itemId: string
  widgetData: ServiceData | null
  pingStatus: ServiceStatus | null
}

/**
 * Provider that opens a single SSE connection to /api/events
 * and writes updates to the module-level LiveDataStore.
 */
export function LiveDataProvider({ children }: { children: ReactNode }) {
  const esRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectRef = useRef<(() => void) | null>(null)
  const backoffRef = useRef(1000)

  const doConnect = useCallback(() => {
    if (typeof window === "undefined") return
    if (esRef.current?.readyState === EventSource.CONNECTING) return

    const es = new EventSource("/api/events")
    esRef.current = es

    es.onopen = () => {
      backoffRef.current = 1000
      liveDataStore.setSseState("connected")
    }

    es.onmessage = (event) => {
      try {
        const msg: SseMessage = JSON.parse(event.data)
        if (msg.type === "update") {
          liveDataStore.set(msg.itemId, {
            widgetData: msg.widgetData,
            pingStatus: msg.pingStatus,
          })
        }
      } catch {
        // ignore malformed messages
      }
    }

    es.onerror = () => {
      es.close()
      liveDataStore.setSseState("disconnected")
      const delay = backoffRef.current
      backoffRef.current = Math.min(delay * 2, MAX_BACKOFF)
      reconnectTimerRef.current = setTimeout(() => {
        connectRef.current?.()
      }, delay)
    }
  }, [])

  useEffect(() => {
    connectRef.current = doConnect
  }, [doConnect])

  useEffect(() => {
    doConnect()
    return () => {
      if (reconnectTimerRef.current) {
        clearTimeout(reconnectTimerRef.current)
        reconnectTimerRef.current = null
      }
      if (esRef.current) {
        esRef.current.close()
        esRef.current = null
      }
      liveDataStore.setSseState("disconnected")
    }
  }, [doConnect])

  return <>{children}</>
}
