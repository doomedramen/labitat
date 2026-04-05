"use client"

import { useState, useEffect, useCallback } from "react"

type NetworkState = {
  isOnline: boolean
  lastOffline?: Date
  lastOnline?: Date
}

/**
 * Hook to monitor network connectivity status
 * Listens to online/offline events and provides current state
 */
export function useNetworkState(): NetworkState {
  const [state, setState] = useState<NetworkState>(() => ({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
  }))

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

  useEffect(() => {
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [handleOnline, handleOffline])

  return state
}
