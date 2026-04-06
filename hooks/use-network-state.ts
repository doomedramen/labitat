"use client"

import { useState, useEffect, useCallback, useRef } from "react"

type NetworkState = {
  isOnline: boolean
  isServerAvailable: boolean
  lastOffline?: Date
  lastOnline?: Date
  lastServerUnavailable?: Date
  lastServerAvailable?: Date
}

/**
 * Hook to monitor network connectivity and server availability
 * Listens to online/offline events and periodically checks server health
 */
export function useNetworkState(): NetworkState {
  const [state, setState] = useState<NetworkState>(() => ({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isServerAvailable: true,
  }))

  const checkIntervalRef = useRef<ReturnType<typeof setInterval> | null>(null)
  const isCheckingRef = useRef(false)

  const handleOnline = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOnline: true,
      lastOnline: new Date(),
    }))
  }, [])

  const handleOffline = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOnline: false,
      lastOffline: new Date(),
    }))
  }, [])

  // Check server availability by making a lightweight request
  const checkServerAvailability = useCallback(async () => {
    // Don't check if we're offline (navigator.onLine is false)
    if (!navigator.onLine) {
      setState((prev) => ({
        ...prev,
        isServerAvailable: false,
        lastServerUnavailable: new Date(),
      }))
      return
    }

    // Prevent concurrent checks
    if (isCheckingRef.current) return
    isCheckingRef.current = true

    try {
      // Use the health endpoint to check server availability
      // Add a cache-busting parameter to avoid cached responses
      const response = await fetch("/api/health?t=" + Date.now(), {
        method: "GET",
        signal: AbortSignal.timeout(5000), // 5 second timeout
      })

      const isAvailable = response.ok

      setState((prev) => ({
        ...prev,
        isServerAvailable: isAvailable,
        lastServerAvailable: isAvailable
          ? new Date()
          : prev.lastServerAvailable,
        lastServerUnavailable: !isAvailable
          ? new Date()
          : prev.lastServerUnavailable,
      }))
    } catch {
      // Server is unavailable
      setState((prev) => ({
        ...prev,
        isServerAvailable: false,
        lastServerUnavailable: new Date(),
      }))
    } finally {
      isCheckingRef.current = false
    }
  }, [])

  useEffect(() => {
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Start periodic server health checks
    // Check every 3 seconds when potentially offline
    checkIntervalRef.current = setInterval(() => {
      checkServerAvailability()
    }, 3000)

    // Initial check
    checkServerAvailability()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      if (checkIntervalRef.current) {
        clearInterval(checkIntervalRef.current)
      }
    }
  }, [handleOnline, handleOffline, checkServerAvailability])

  return state
}
