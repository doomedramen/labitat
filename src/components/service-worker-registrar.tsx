"use client"

import { useEffect, useRef } from "react"
import { toast } from "sonner"

/** Registers the service worker and handles updates */
export function ServiceWorkerRegistrar() {
  const toastIdRef = useRef<string | number | null>(null)

  useEffect(() => {
    if (!("serviceWorker" in navigator)) return

    const showUpdateToast = (worker: ServiceWorker) => {
      toastIdRef.current = toast.info("Update available", {
        description: "A new version of Labitat is ready.",
        action: {
          label: "Refresh",
          onClick: () => {
            worker.postMessage({ type: "SKIP_WAITING" })
            window.location.reload()
          },
        },
        duration: Infinity,
      })
    }

    navigator.serviceWorker
      .register("/sw.js")
      .then((registration) => {
        console.log("[SW] Registered:", registration.scope)

        // Detect when an update is found and a waiting worker exists
        registration.addEventListener("updatefound", () => {
          const newWorker = registration.installing
          if (!newWorker) return

          newWorker.addEventListener("statechange", () => {
            console.log("[SW] Worker state:", newWorker.state)

            if (
              newWorker.state === "installed" &&
              navigator.serviceWorker.controller
            ) {
              showUpdateToast(newWorker)
            }
          })
        })

        // Check if there's already a waiting worker on load
        if (registration.waiting) {
          showUpdateToast(registration.waiting)
        }
      })
      .catch((err) => {
        console.error("[SW] Registration failed:", err)
      })

    // If the page was reloaded because the user clicked "Refresh",
    // dismiss any lingering toast
    const cleanup = () => {
      if (toastIdRef.current != null) {
        toast.dismiss(toastIdRef.current)
      }
    }
    window.addEventListener("beforeunload", cleanup)
    return () => {
      window.removeEventListener("beforeunload", cleanup)
      cleanup()
    }
  }, [])

  return null
}
