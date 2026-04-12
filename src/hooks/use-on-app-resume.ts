"use client"

import { useEffect, useRef, useCallback } from "react"

/**
 * Hook that detects when the app resumes from background (PWA resume).
 * Calls the provided callback when the document transitions from hidden → visible.
 * Does NOT trigger on initial mount.
 */
export function useOnAppResume(callback: () => void) {
  const callbackRef = useRef(callback)
  const isHiddenRef = useRef(false)

  // Keep callback ref in sync
  useEffect(() => {
    callbackRef.current = callback
  }, [callback])

  useEffect(() => {
    if (typeof document === "undefined") return

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        // Only trigger if the app was previously hidden (not on initial mount)
        if (isHiddenRef.current) {
          callbackRef.current()
        }
        isHiddenRef.current = false
      } else {
        isHiddenRef.current = true
      }
    }

    // Set initial state
    isHiddenRef.current = document.visibilityState === "hidden"

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])
}

/**
 * Hook that returns a function to manually trigger app resume revalidation.
 * Useful for components that need to trigger revalidation programmatically.
 */
export function useAppResumeTrigger(): { triggerResume: () => void } {
  const listenersRef = useRef<Set<() => void>>(new Set())

  const triggerResume = useCallback(() => {
    listenersRef.current.forEach((listener) => listener())
  }, [])

  useEffect(() => {
    if (typeof document === "undefined") return

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        listenersRef.current.forEach((listener) => listener())
      }
    }

    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])

  return { triggerResume }
}
