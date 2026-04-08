"use client"

import { useState, useEffect, useRef } from "react"
import { Wifi, ServerOff } from "lucide-react"
import { useNetworkState } from "@/hooks/use-network-state"
import { useOfflineBannerStore } from "@/lib/stores/offline-banner-store"
import { cn } from "@/lib/utils"

const BASE_TITLE = "Labitat"

/**
 * Banner that shows when the app is offline or the server is unreachable.
 * Uses browser online/offline events + server health polling.
 * When dismissed while offline, appends "(offline)" to the page/tab title.
 */
export function ReconnectionBanner() {
  const { isOnline, isServerAvailable, isInitialized, lastOffline } =
    useNetworkState()
  const [dismissed, setDismissed] = useState(false)
  const wasOfflineRef = useRef(false)
  const [showReconnected, setShowReconnected] = useState(false)
  const dismissTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const setDismissedWhileOffline = useOfflineBannerStore(
    (s) => s.setDismissedWhileOffline
  )

  const isCurrentlyOffline = !isOnline || !isServerAvailable

  // Track transitions from offline -> online (only after first check resolves)
  useEffect(() => {
    if (!isInitialized) return

    if (isCurrentlyOffline) {
      wasOfflineRef.current = true
      return
    }

    if (wasOfflineRef.current) {
      wasOfflineRef.current = false
      setDismissedWhileOffline(false)

      // eslint-disable-next-line react-hooks/set-state-in-effect -- transition tracking requires synchronous state update
      setShowReconnected(true)
      setDismissed(false)

      // Auto-dismiss reconnected message after 3 seconds
      if (dismissTimerRef.current) {
        clearTimeout(dismissTimerRef.current)
      }
      dismissTimerRef.current = setTimeout(() => {
        setShowReconnected(false)
      }, 3000)
    }
  }, [isCurrentlyOffline, isInitialized, setDismissedWhileOffline])

  // Cleanup timers on unmount
  useEffect(() => {
    return () => {
      if (dismissTimerRef.current) clearTimeout(dismissTimerRef.current)
    }
  }, [])

  // Don't show anything until the first health check has completed
  if (!isInitialized) return null

  // Don't show anything if online, server available, and no recent reconnection
  if (isOnline && isServerAvailable && !showReconnected) return null

  // Dismissed state — track in store so dashboard can show "(offline)" suffix
  if (dismissed) {
    if (isCurrentlyOffline) {
      setDismissedWhileOffline(true)
    }
    return null
  }

  const handleDismiss = () => setDismissed(true)

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
      data-testid={isCurrentlyOffline ? "offline-banner" : "reconnected-banner"}
    >
      {showReconnected ? (
        <>
          <Wifi className="size-4" />
          <span>Back online!</span>
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
            onClick={handleDismiss}
            className="pointer-events-auto ml-2 rounded px-2 py-0.5 text-xs opacity-80 hover:opacity-100"
            aria-label="Dismiss"
          >
            Dismiss
          </button>
        </>
      )}
    </div>
  )
}

/**
 * Hook that returns a title suffix. Returns "(offline)" when the user
 * has dismissed the offline banner while currently offline.
 */
export function useOfflineTitleSuffix(): string {
  const dismissedWhileOffline = useOfflineBannerStore(
    (s) => s.dismissedWhileOffline
  )
  const { isOnline, isServerAvailable } = useNetworkState()
  const isCurrentlyOffline = !isOnline || !isServerAvailable

  useEffect(() => {
    const suffix =
      dismissedWhileOffline && isCurrentlyOffline ? " (offline)" : ""
    document.title = `${BASE_TITLE}${suffix}`
  }, [dismissedWhileOffline, isCurrentlyOffline])

  return dismissedWhileOffline && isCurrentlyOffline ? " (offline)" : ""
}
