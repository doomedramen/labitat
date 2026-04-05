"use client"

import { useEffect, useRef } from "react"
import { SWRConfig, mutate } from "swr"
import { useNetworkState } from "@/hooks/use-network-state"

export function SWRProvider({ children }: { children: React.ReactNode }) {
  const { isOnline } = useNetworkState()
  const wasOnlineRef = useRef(isOnline)

  // Revalidate all SWR caches when reconnecting after being offline
  useEffect(() => {
    if (wasOnlineRef.current === false && isOnline === true) {
      // Small delay to ensure server is ready
      const timer = setTimeout(() => {
        mutate(() => true, undefined, { revalidate: true })
      }, 1000)
      return () => clearTimeout(timer)
    }
    wasOnlineRef.current = isOnline
  }, [isOnline])

  return (
    <SWRConfig
      value={{
        // Global SWR configuration
        revalidateOnFocus: false,
        revalidateIfStale: false,
        revalidateOnReconnect: true,
        dedupingInterval: 200,
        // Retry strategy for server errors (5xx) and network failures
        shouldRetryOnError: true,
        errorRetryCount: 5,
        // Keep previous data while revalidating (prevents flash of empty state)
        keepPreviousData: true,
        // Don't hang on errors - show them immediately
        suspense: false,
      }}
    >
      {children}
    </SWRConfig>
  )
}
