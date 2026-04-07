"use client"

import { useEffect, useState, useCallback } from "react"
import { RefreshCw, X } from "lucide-react"

const IOS_INSTALL_DISMISSED_KEY = "labitat-ios-install-dismissed"
const SW_UPDATE_DISMISSED_KEY = "labitat-sw-update-dismissed"

/**
 * Handles service worker update notifications and iOS install prompts.
 * Service worker registration is handled by @serwist/next automatically.
 */
export function ServiceWorkerRegistrar() {
  // Lazy initializers run only on the client (never during SSR) because
  // this is a "use client" component and the initializer runs after hydration.
  const [isIOS] = useState(() => {
    if (typeof navigator === "undefined") return false
    return (
      /iPad|iPhone|iPod/.test(navigator.userAgent) &&
      !(window as Window & typeof globalThis & { MSStream?: unknown }).MSStream
    )
  })

  const [isStandalone] = useState(() => {
    if (typeof window === "undefined") return false
    return (
      window.matchMedia("(display-mode: standalone)").matches ||
      (window.navigator as Navigator & { standalone?: boolean }).standalone ===
        true
    )
  })

  const [updateAvailable, setUpdateAvailable] = useState(false)
  const [updateDismissed, setUpdateDismissed] = useState(() => {
    if (typeof sessionStorage === "undefined") return false
    return sessionStorage.getItem(SW_UPDATE_DISMISSED_KEY) !== null
  })

  const handleUpdateReload = useCallback(() => {
    // Clear the dismissal flag when user clicks to reload
    sessionStorage.removeItem(SW_UPDATE_DISMISSED_KEY)
    window.location.reload()
  }, [])

  const handleDismissUpdate = useCallback(() => {
    sessionStorage.setItem(SW_UPDATE_DISMISSED_KEY, "true")
    setUpdateDismissed(true)
  }, [])

  // Listen for service worker updates from the already-registered SW
  // Serwist registers the SW at /serwist/sw.js
  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    navigator.serviceWorker
      .getRegistration("/serwist/sw.js")
      .then((registration) => {
        if (!registration) return

        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener("statechange", () => {
            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              // New content available - show update banner instead of auto-reloading
              setUpdateAvailable(true)
              setUpdateDismissed(false)
            }
          })
        })
      })
      .catch(console.error)
  }, [])

  // Show update available banner
  if (updateAvailable && !updateDismissed) {
    return (
      <div className="pointer-events-none fixed top-0 right-0 left-0 z-50 flex items-center justify-center gap-2 bg-blue-500 px-4 py-3 text-sm font-medium text-white shadow-lg transition-all duration-300">
        <RefreshCw className="size-4" />
        <span>New version available</span>
        <button
          onClick={handleUpdateReload}
          className="pointer-events-auto rounded bg-white px-2 py-0.5 text-xs font-medium text-blue-600 hover:bg-blue-50"
          aria-label="Refresh to update"
        >
          Refresh
        </button>
        <button
          onClick={handleDismissUpdate}
          className="pointer-events-auto ml-2 rounded px-2 py-0.5 text-xs opacity-80 hover:opacity-100"
          aria-label="Dismiss"
        >
          <X className="size-3" />
        </button>
      </div>
    )
  }

  if (!isIOS || isStandalone) {
    return null
  }

  return <IOSInstallPrompt />
}

function IOSInstallPrompt() {
  const [dismissed, setDismissed] = useState(() => {
    if (typeof localStorage === "undefined") return false
    return localStorage.getItem(IOS_INSTALL_DISMISSED_KEY) !== null
  })

  const handleDismiss = () => {
    localStorage.setItem(IOS_INSTALL_DISMISSED_KEY, "true")
    setDismissed(true)
  }

  if (dismissed) {
    return null
  }

  return (
    <div className="fixed right-4 bottom-4 left-4 z-50 rounded-xl border border-border bg-background p-4 shadow-lg sm:right-4 sm:left-auto sm:max-w-sm">
      <div className="flex items-start gap-3">
        <div className="flex size-10 flex-none items-center justify-center rounded-lg bg-primary text-primary-foreground">
          <svg
            className="size-5"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M12 18v-6m0 0V6m0 6h6m-6 0H6"
            />
          </svg>
        </div>
        <div className="flex-1">
          <h3 className="text-sm font-semibold">Install on iPhone</h3>
          <p className="mt-1 text-xs text-muted-foreground">
            Install Labitat on your Home Screen for quick access and offline
            support.
          </p>
          <ol className="mt-2 space-y-1 text-xs text-muted-foreground">
            <li>
              1. Tap <strong className="text-foreground">Share</strong> button
            </li>
            <li>
              2. Tap{" "}
              <strong className="text-foreground">Add to Home Screen</strong>
            </li>
          </ol>
        </div>
        <button
          onClick={handleDismiss}
          className="flex-none rounded p-1 text-muted-foreground hover:bg-muted hover:text-foreground"
          aria-label="Dismiss"
        >
          <svg
            className="size-4"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M6 18L18 6M6 6l12 12"
            />
          </svg>
        </button>
      </div>
    </div>
  )
}
