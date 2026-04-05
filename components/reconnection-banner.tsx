"use client"

import { useState, useEffect, useRef, useCallback } from "react"
import { WifiOff, Wifi, RefreshCw } from "lucide-react"
import { useNetworkState } from "@/hooks/use-network-state"
import { cn } from "@/lib/utils"

/**
 * Banner that shows when the app is offline and when it reconnects
 * Automatically dismisses after reconnection
 */
export function ReconnectionBanner() {
  const { isOnline, lastOffline } = useNetworkState()
  const [showReconnected, setShowReconnected] = useState(false)
  const [dismissed, setDismissed] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  const handleOnline = useCallback(() => {
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

  // Listen for online event
  useEffect(() => {
    window.addEventListener("online", handleOnline)
    return () => {
      window.removeEventListener("online", handleOnline)
    }
  }, [handleOnline])

  // Cleanup timer on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current)
      }
    }
  }, [])

  // Don't show anything if online and no recent reconnection
  if (isOnline && !showReconnected) return null

  // Dismissed state
  if (dismissed) return null

  return (
    <div
      className={cn(
        "fixed top-0 right-0 left-0 z-50 flex items-center justify-center gap-2 px-4 py-3 text-sm font-medium shadow-lg transition-all duration-300",
        isOnline ? "bg-emerald-500 text-white" : "bg-red-500 text-white"
      )}
      role="alert"
      aria-live="assertive"
    >
      {isOnline ? (
        <>
          <Wifi className="size-4" />
          <span>Back online! Data is refreshing...</span>
          <RefreshCw className="size-4 animate-spin" />
        </>
      ) : (
        <>
          <WifiOff className="size-4" />
          <span>
            You&apos;re offline
            {lastOffline && (
              <span className="ml-1 text-xs opacity-90">
                (since {lastOffline.toLocaleTimeString()})
              </span>
            )}
          </span>
          <button
            onClick={() => setDismissed(true)}
            className="ml-2 rounded px-2 py-0.5 text-xs opacity-80 hover:opacity-100"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </>
      )}
    </div>
  )
}
