"use client"

import { useEffect, useState } from "react"

export default function OfflinePageClient() {
  const [isOnline, setIsOnline] = useState<boolean | null>(null)

  useEffect(() => {
    const handleOnline = () => setIsOnline(true)
    const handleOffline = () => setIsOnline(false)
    window.addEventListener("online", handleOnline)
    window.addEventListener("offline", handleOffline)
    // Set initial state after mount via event handlers
    handleOnline()
    if (!navigator.onLine) {
      handleOffline()
    }
    return () => {
      window.removeEventListener("online", handleOnline)
      window.removeEventListener("offline", handleOffline)
    }
  }, [])

  return (
    <div className="flex min-h-svh flex-col items-center justify-center gap-4 p-6 text-center">
      <div className="text-6xl">📡</div>
      <h1 className="text-2xl font-bold">You&apos;re offline</h1>
      <p className="text-muted-foreground">
        {isOnline === null
          ? "Checking connection..."
          : isOnline
            ? "Connection restored!"
            : "Check your internet connection and try again."}
      </p>
      {isOnline && (
        <button
          onClick={() => window.location.reload()}
          className="rounded-md bg-primary px-4 py-2 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Reload page
        </button>
      )}
    </div>
  )
}
