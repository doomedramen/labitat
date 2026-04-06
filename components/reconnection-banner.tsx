"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { Wifi, RefreshCw, ServerOff } from "lucide-react"
import { useNetworkState } from "@/hooks/use-network-state"
import { cn } from "@/lib/utils"

/**
 * Banner that shows when the app is offline or server is unavailable
 * Automatically refreshes the page when the server comes back online
 */
export function ReconnectionBanner() {
  const { isOnline, isServerAvailable, lastOffline } = useNetworkState()
  const [showReconnected, setShowReconnected] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const reloadTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const isCurrentlyOffline = !isOnline || !isServerAvailable

  const handleServerRecovered = useCallback(() => {
    setShowReconnected(true)
    setDismissed(false)

    // Auto-dismiss after 3 seconds
    if (dismissTimerRef.current) {
      clearTimeout(dismissTimerRef.current)
    }
    dismissTimerRef.current = setTimeout(() => {
      setShowReconnected(false)
    }, 3000)
  }, [])

  // Use a ref to track offline status without triggering re-renders
  const wasOfflineRef = useRef(false)

  // Listen for recovery (either network or server)
  useEffect(() => {
    // Track when we go offline
    if (isCurrentlyOffline) {
      wasOfflineRef.current = true
      return
    }

    // If we were offline and now both are available, show recovery banner
    if (wasOfflineRef.current && !showReconnected) {
      // Defer state update to avoid synchronous cascade
      const recoveryId = setTimeout(() => {
        handleServerRecovered()
      }, 0)

      // Auto-reload the page after a short delay to get fresh content
      reloadTimerRef.current = setTimeout(() => {
        window.location.reload()
      }, 2000)

      return () => clearTimeout(recoveryId)
    }
  }, [isCurrentlyOffline, showReconnected, handleServerRecovered])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current)
      }
      if (reloadTimerRef.current) {
        clearTimeout(reloadTimerRef.current)
      }
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
          <span>Server is back online! Refreshing...</span>
          <RefreshCw className="size-4 animate-spin" />
        </>
      ) : isCurrentlyOffline ? (
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
      ) : (
        <>
          <Wifi className="size-4" />
          <span>Back online! Data is refreshing...</span>
          <RefreshCw className="size-4 animate-spin" />
        </>
      )}
    </div>
  )
}
