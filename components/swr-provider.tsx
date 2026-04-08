"use client"

import { SWRConfig } from "swr"

export function SWRProvider({ children }: { children: React.ReactNode }) {
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
        // Revalidate on mount to ensure fresh data on initial load
        revalidateOnMount: true,
      }}
    >
      {children}
    </SWRConfig>
  )
}
