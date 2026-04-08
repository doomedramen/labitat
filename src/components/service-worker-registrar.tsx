"use client"

import { useEffect } from "react"

/** Registers the service worker */
export function ServiceWorkerRegistrar() {
  useEffect(() => {
    if ("serviceWorker" in navigator) {
      navigator.serviceWorker
        .register("/sw.js")
        .then((registration) => {
          console.log("[SW] Registered:", registration.scope)
        })
        .catch((err) => {
          console.error("[SW] Registration failed:", err)
        })
    }
  }, [])

  return null
}
