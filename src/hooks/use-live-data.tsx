"use client"

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useRef,
  useState,
  type ReactNode,
} from "react"
import type { ServiceData, ServiceStatus } from "@/lib/adapters/types"

interface SseMessage {
  type: "update"
  itemId: string
  widgetData: ServiceData | null
  pingStatus: ServiceStatus | null
}

interface LiveDataEntry {
  widgetData: ServiceData | null
  pingStatus: ServiceStatus | null
}

interface LiveDataContextValue {
  getData: (itemId: string) => LiveDataEntry
}

const LiveDataContext = createContext<LiveDataContextValue | null>(null)

/**
 * Provider that opens a single SSE connection to /api/events
 * and shares the cache with all consumers via React context.
 */
export function LiveDataProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<Map<string, LiveDataEntry>>(new Map())
  const esRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectRef = useRef<(() => void) | null>(null)
  const backoffRef = useRef(1000)
  const MAX_BACKOFF = 30_000

  const doConnect = useCallback(() => {
    if (typeof window === "undefined") return
    if (esRef.current?.readyState === EventSource.CONNECTING) return

    const es = new EventSource("/api/events")
    esRef.current = es

    es.onopen = () => {
      backoffRef.current = 1000
    }

    es.onmessage = (event) => {
      try {
        const msg: SseMessage = JSON.parse(event.data)
        if (msg.type === "update") {
          setCache((prev) => {
            const next = new Map(prev)
            next.set(msg.itemId, {
              widgetData: msg.widgetData,
              pingStatus: msg.pingStatus,
            })
            return next
          })
        }
      } catch {
        // ignore malformed messages
      }
    }

    es.onerror = () => {
      es.close()
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
    }
  }, [doConnect])

  const getData = useCallback(
    (itemId: string) => {
      return cache.get(itemId) ?? { widgetData: null, pingStatus: null }
    },
    [cache]
  )

  return (
    <LiveDataContext.Provider value={{ getData }}>
      {children}
    </LiveDataContext.Provider>
  )
}

/**
 * Hook to access live data from the shared SSE connection.
 * Must be used within a LiveDataProvider.
 */
export function useLiveData(): LiveDataContextValue {
  const ctx = useContext(LiveDataContext)
  if (!ctx) {
    throw new Error("useLiveData must be used within a LiveDataProvider")
  }
  return ctx
}
