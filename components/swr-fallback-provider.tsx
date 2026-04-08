"use client"

import { SWRConfig } from "swr"

/**
 * Thin client boundary that injects server-preloaded data into the SWR cache.
 * Wrap this around page content in a Server Component, passing a fallback map
 * built from the server's cached datapoints.  Child components that call
 * useSWR() with matching keys will receive the fallback immediately — on the
 * first SSR render and on hydration — with no loading flash.
 */
export function SWRFallbackProvider({
  fallback,
  children,
}: {
  fallback: Record<string, unknown>
  children: React.ReactNode
}) {
  return <SWRConfig value={{ fallback }}>{children}</SWRConfig>
}
