"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Wifi, RefreshCw, ServerOff } from "lucide-react"
import { useNetworkState } from "@/hooks/use-network-state"
import { mutate } from "swr"
import { cn } from "@/lib/utils"

/**
 * Banner that shows when the app is offline or server is unavailable
 * Automatically refreshes data when the server comes back online
 */
export function ReconnectionBanner() {
  const { isOnline, isServerAvailable, lastOffline, isChecking } =
    useNetworkState()
  const wasOfflineRef = useRef(false)
  const [showReconnected, setShowReconnected] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const [isRevalidating, setIsRevalidating] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isCurrentlyOffline = !isOnline || !isServerAvailable

  const handleServerRecovered = useCallback(async () => {
    setShowReconnected(true)
    setDismissed(false)
    setIsRevalidating(true)
    wasOfflineRef.current = false

    // Revalidate all SWR caches to refresh data without full page reload
    try {
      await mutate(() => true, undefined, { revalidate: true })
      setIsRevalidating(false)
    } catch {
      // Revalidation failed, keep showing the banner
      setIsRevalidating(false)
    }

    // Auto-dismiss after 3 seconds
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
    }
    dismissTimerRef.current = setTimeout(() => {
      setShowReconnected(false)
    }, 3000)
  }, [])

  // Track offline state and trigger recovery when back online
  useEffect(() => {
    if (isCurrentlyOffline) {
      wasOfflineRef.current = true
      return
    }

    if (wasOfflineRef.current && !showReconnected) {
      const recoveryId = setTimeout(() => {
        handleServerRecovered()
      }, 0)
      return () => clearTimeout(recoveryId)
    }
  }, [isCurrentlyOffline, showReconnected, handleServerRecovered])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
  }, [])

  // Don't show anything if online, server available, and no recent reconnection
  if (isOnline && isServerAvailable && !showReconnected) return null

  // Dismissed state
  if (dismissed) return null

  return (
    <div
      key={isCurrentlyOffline ? "offline" : "reconnected"}
      className={cn(
        "pointer-events-none fixed top-0 right-0 left-0 z-50 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300",
        isCurrentlyOffline
          ? "bg-red-500 text-white"
          : "bg-emerald-500 text-white"
      )}
      role="alert"
      aria-live="assertive"
    >
      {showReconnected ? (
        <>
          <Wifi className="size-4" />
          <span>
            {isRevalidating ? "Refreshing data..." : "Server is back online!"}
          </span>
          <RefreshCw
            className={cn("size-4", isRevalidating && "animate-spin")}
          />
        </>
      ) : (
        <>
          {isChecking ? (
            <>
              <RefreshCw className="size-4 animate-spin" />
              <span>Checking connection...</span>
            </>
          ) : (
            <>
              <ServerOff className="size-4" />
              <span>
                {isOnline ? "Server unavailable" : "You're offline"}
                {lastOffline && (
                  <span className="ml-1 text-xs opacity-90">
                    (since {lastOffline.toLocaleTimeString()})
                  </span>
                )}
              </span>
              <button
                onClick={() => setDismissed(true)}
                className="pointer-events-auto ml-2 rounded px-2 py-0.5 text-xs opacity-80 hover:opacity-100"
                aria-label="Dismiss"
              >
                Dismiss
              </button>
            </>
          )}
        </>
      )}
    </div>
  )
}
