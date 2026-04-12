"use client"

import { useEffect, useRef, useState, useCallback } from "react"
import type { ServiceData, ServiceStatus } from "@/lib/adapters/types"

interface SseMessage {
  type: "update"
  itemId: string
  widgetData: ServiceData | null
  pingStatus: ServiceStatus | null
}

/**
 * Server-Sent Events hook for receiving real-time service data updates.
 * Connects to /api/events and updates cache on each message.
 */
export function useLiveData() {
  const [cache, setCache] = useState<
    Map<
      string,
      { widgetData: ServiceData | null; pingStatus: ServiceStatus | null }
    >
  >(new Map())
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

  // Store connect function in ref so onerror can call it
  useEffect(() => {
    connectRef.current = doConnect
  }, [doConnect])

  // Start connection on mount, cleanup on unmount
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

  return { getData, connected }
}
