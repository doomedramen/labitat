"use client"

import { useState, useEffect, useCallback, useRef } from "react"

type NetworkState = {
  isOnline: boolean
  isServerAvailable: boolean
  isChecking: boolean
  lastOffline?: Date
  lastOnline?: Date
  lastServerUnavailable?: Date
  lastServerAvailable?: Date
}

// Exponential backoff configuration
const INITIAL_CHECK_INTERVAL = 3000 // 3 seconds
const MAX_CHECK_INTERVAL = 60000 // 60 seconds
const BACKOFF_MULTIPLIER = 1.5
const CONSECUTIVE_FAILURES_TO_MARK_OFFLINE = 2

/**
 * Hook to monitor network connectivity and server availability
 * Listens to online/offline events and periodically checks server health
 * with exponential backoff to avoid excessive requests
 */
export function useNetworkState(): NetworkState {
  const [state, setState] = useState<NetworkState>(() => ({
    isOnline: typeof navigator !== "undefined" ? navigator.onLine : true,
    isServerAvailable: true, // Assume available until proven otherwise
    isChecking: false,
  }))

  const checkTimeoutRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const isCheckingRef = useRef(false)
  // Track if we've completed at least one successful check
  const hasInitialCheckRef = useRef(false)
  // Track consecutive failures for debouncing
  const consecutiveFailuresRef = useRef(0)
  // Track current backoff interval
  const currentIntervalRef = useRef(INITIAL_CHECK_INTERVAL)
  // Ref to store the check function to avoid circular dependencies
  const checkFnRef = useRef<(() => Promise<void>) | null>(null)

  const handleOnline = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOnline: true,
      lastOnline: new Date(),
    }))
    // Reset backoff on online event
    consecutiveFailuresRef.current = 0
    currentIntervalRef.current = INITIAL_CHECK_INTERVAL
  }, [])

  const handleOffline = useCallback(() => {
    setState((prev) => ({
      ...prev,
      isOnline: false,
      lastOffline: new Date(),
    }))
  }, [])

  // Schedule next check with exponential backoff
  const scheduleNextCheck = useCallback(() => {
    if (checkTimeoutRef.current) {
      clearTimeout(checkTimeoutRef.current)
    }

    const interval = currentIntervalRef.current
    checkTimeoutRef.current = setTimeout(() => {
      if (checkFnRef.current) {
        checkFnRef.current()
      }
    }, interval)
  }, [])

  // Increase backoff interval after failure
  const increaseBackoff = useCallback(() => {
    currentIntervalRef.current = Math.min(
      Math.round(currentIntervalRef.current * BACKOFF_MULTIPLIER),
      MAX_CHECK_INTERVAL
    )
  }, [])

  // Reset backoff to initial interval after success
  const resetBackoff = useCallback(() => {
    consecutiveFailuresRef.current = 0
    currentIntervalRef.current = INITIAL_CHECK_INTERVAL
  }, [])

  // Check server availability by making a lightweight request
  const checkServerAvailability = useCallback(async () => {
    // Prevent concurrent checks
    if (isCheckingRef.current) return
    isCheckingRef.current = true

    setState((prev) => ({ ...prev, isChecking: true }))

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
        isOnline: true, // If we got a response, we're online
        isServerAvailable: isAvailable,
        isChecking: false,
        lastServerAvailable: isAvailable
          ? new Date()
          : prev.lastServerAvailable,
        lastServerUnavailable: !isAvailable
          ? new Date()
          : prev.lastServerUnavailable,
      }))

      hasInitialCheckRef.current = true
      consecutiveFailuresRef.current = 0
      resetBackoff()
      scheduleNextCheck()
    } catch (error) {
      consecutiveFailuresRef.current += 1

      const shouldMarkOffline =
        consecutiveFailuresRef.current >= CONSECUTIVE_FAILURES_TO_MARK_OFFLINE

      // Only mark as offline if we've completed the initial check
      // and we have enough consecutive failures (debouncing)
      if (hasInitialCheckRef.current && shouldMarkOffline) {
        const isNetworkError =
          error instanceof TypeError ||
          (error instanceof DOMException && error.name === "AbortError")

        setState((prev) => ({
          ...prev,
          isServerAvailable: false,
          isChecking: false,
          isOnline: isNetworkError ? false : prev.isOnline,
          lastServerUnavailable: new Date(),
        }))
      } else {
        setState((prev) => ({ ...prev, isChecking: false }))
      }

      // Increase backoff interval for next check
      increaseBackoff()
      scheduleNextCheck()
    } finally {
      isCheckingRef.current = false
    }
  }, [scheduleNextCheck, increaseBackoff, resetBackoff])

  // Store the check function in ref for scheduling
  checkFnRef.current = checkServerAvailability

  useEffect(() => {
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)

    // Initial check
    checkServerAvailability()

    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
      if (checkTimeoutRef.current) {
        clearTimeout(checkTimeoutRef.current)
      }
    }
  }, [handleOnline, handleOffline, checkServerAvailability])

  return state
}
