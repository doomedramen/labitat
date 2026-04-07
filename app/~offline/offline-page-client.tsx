"use client"

import { useEffect } from "react"
import { WifiOff, RefreshCw } from "lucide-react"
import { useNetworkState } from "@/hooks/use-network-state"

export default function OfflinePageClient() {
  const { isOnline, isServerAvailable } = useNetworkState()

  useEffect(() => {
    if (isOnline && isServerAvailable) {
      // Delay redirect slightly to allow the page to render first
      // This prevents hydration mismatch and allows tests to verify the page
      const timer = setTimeout(() => {
        window.location.href = "/"
      }, 100)
      return () => clearTimeout(timer)
    }
  }, [isOnline, isServerAvailable])

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-emerald-500 to-emerald-600 text-gray-800">
      <div className="max-w-md space-y-6 p-8 text-center">
        <WifiOff className="mx-auto size-16 text-white/80" />
        <h1 className="text-2xl font-semibold text-gray-900">
          You&apos;re Offline
        </h1>
        <p className="text-gray-700">
          The dashboard is currently unavailable.
          <br />
          Your cached data will be shown once the connection is restored.
        </p>

        <div className="inline-flex items-center gap-2 rounded-full bg-white/90 px-4 py-2 text-sm">
          <span className="size-2 animate-pulse rounded-full bg-red-500" />
          <span>Waiting for connection...</span>
        </div>

        <div>
          <button
            onClick={() => (window.location.href = "/")}
            className="inline-flex items-center gap-2 rounded-lg bg-gray-900 px-6 py-3 text-sm text-white transition-colors hover:bg-gray-700"
          >
            <RefreshCw className="size-4" />
            Try Again
          </button>
        </div>
      </div>
    </div>
  )
}
