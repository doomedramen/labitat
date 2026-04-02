"use client"

import { SWRConfig } from "swr"

export function SWRProvider({ children }: { children: React.ReactNode }) {
  return (
    <SWRConfig
      value={{
        // Global SWR configuration
        revalidateOnFocus: false,
        revalidateIfStale: false,
        dedupingInterval: 200,
      }}
    >
      {children}
    </SWRConfig>
  )
}
