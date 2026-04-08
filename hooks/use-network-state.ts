"use client"

import { useEffect, useState, useRef, useCallback } from "react"

type NetworkState = {
  isOnline: boolean
  isServerAvailable: boolean
  isChecking: boolean
  isInitialized: boolean
  lastOffline?: Date
  lastOnline?: Date
  lastServerUnavailable?: Date
  lastServerAvailable?: Date
}

const RECONNECT_DELAY = 3_000 // 3 seconds between reconnect attempts
const isClient = typeof window !== "undefined"

/**
 * Hook to monitor network connectivity and server availability.
 * - Uses browser `navigator.onLine` + `online`/`offline` events for network state
 * - Maintains a persistent SSE connection to `/api/health/stream` to detect
 *   server reachability instantly — no polling needed
 */
export function useNetworkState(): NetworkState {
  const [isOnline, setIsOnline] = useState(() =>
    isClient ? navigator.onLine : true
  )
  const [isServerAvailable, setIsServerAvailable] = useState(false)
  const [isChecking, setIsChecking] = useState(isClient)
  const [isInitialized, setIsInitialized] = useState(false)
  const [lastOffline, setLastOffline] = useState<Date | undefined>()
  const [lastOnline, setLastOnline] = useState<Date | undefined>()
  const [lastServerUnavailable, setLastServerUnavailable] = useState<
    Date | undefined
  >()
  const [lastServerAvailable, setLastServerAvailable] = useState<
    Date | undefined
  >()

  const esRef = useRef<EventSource | null>(null)
  const reconnectTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const unmountedRef = useRef(false)
  const connectRef = useRef<(() => void) | null>(null)

  const connect = useCallback(() => {
    if (!isClient || unmountedRef.current) return

    setIsChecking(true)

    const es = new EventSource("/api/health/stream")
    esRef.current = es

    es.onopen = () => {
      setIsServerAvailable(true)
      setLastServerAvailable(new Date())
      setIsChecking(false)
      setIsInitialized(true)
    }

    es.onmessage = () => {
      setIsServerAvailable(true)
      setLastServerAvailable(new Date())
    }

    es.onerror = () => {
      es.close()
      esRef.current = null
      setIsServerAvailable(false)
      setLastServerUnavailable(new Date())
      setIsChecking(false)
      setIsInitialized(true)

      // Reconnect after delay unless offline or unmounted
      reconnectTimerRef.current = setTimeout(() => {
        if (!unmountedRef.current && navigator.onLine) connectRef.current?.()
      }, RECONNECT_DELAY)
    }
  }, [])

  // Manage SSE connection lifecycle
  useEffect(() => {
    unmountedRef.current = false
    connectRef.current = connect
    // eslint-disable-next-line react-hooks/set-state-in-effect -- SSE init on mount is a valid effect
    connect()
    return () => {
      unmountedRef.current = true
      esRef.current?.close()
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    }
  }, [connect])

  // Listen to browser online/offline events
  useEffect(() => {
    if (!isClient) return

    const handleOnline = () => {
      setIsOnline(true)
      setLastOnline(new Date())
      // Reconnect SSE immediately
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
      esRef.current?.close()
      connect()
    }

    const handleOffline = () => {
      setIsOnline(false)
      setIsServerAvailable(false)
      setLastOffline(new Date())
      setIsInitialized(true)
      // Close SSE — no point keeping it open
      esRef.current?.close()
      esRef.current = null
      if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
    }

    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [connect])

  // Handle PWA background/foreground transitions.
  // When a PWA is backgrounded on mobile, the SSE connection is silently
  // dropped. On return, navigator.onLine may still be true, so the stale
  // reconnect loop never recovers. Force a fresh reconnect on visibility change.
  useEffect(() => {
    if (!isClient) return

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Close any stale SSE connection and reconnect fresh
        if (reconnectTimerRef.current) clearTimeout(reconnectTimerRef.current)
        esRef.current?.close()
        esRef.current = null
        // Optimistically assume server is available to prevent a flash of
        // "You're offline" while the new SSE connection establishes.
        setIsServerAvailable(true)
        connect()
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [connect])

  return {
    isOnline,
    isServerAvailable,
    isChecking,
    isInitialized,
    lastOffline,
    lastOnline,
    lastServerUnavailable,
    lastServerAvailable,
  }
}
