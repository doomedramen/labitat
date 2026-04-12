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
  connected: boolean
}

const LiveDataContext = createContext<LiveDataContextValue | null>(null)

/**
 * Provider that opens a single SSE connection to /api/events
 * and shares the cache with all consumers via React context.
 */
export function LiveDataProvider({ children }: { children: ReactNode }) {
  const [cache, setCache] = useState<Map<string, LiveDataEntry>>(new Map())
  const [connected, setConnected] = useState(false)
  const esRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const connectRef = useRef<(() => void) | null>(null)

  const doConnect = useCallback(() => {
    if (typeof window === "undefined") return
    if (esRef.current?.readyState === EventSource.CONNECTING) return

    const es = new EventSource("/api/events")
    esRef.current = es

    es.onopen = () => setConnected(true)

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
      setConnected(false)
      es.close()
      // Reconnect after 3 seconds
      reconnectTimerRef.current = setTimeout(() => {
        connectRef.current?.()
      }, 3000)
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
    <LiveDataContext.Provider value={{ getData, connected }}>
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
