"use client"

import { SerwistProvider as SerwistProviderBase } from "@serwist/turbopack/react"

// Service worker is disabled in development and test environments
const isDevOrTest =
  process.env.NODE_ENV === "development" || process.env.NODE_ENV === "test"

export function SerwistProvider({
  children,
  swUrl = "/serwist/sw.js",
}: {
  children: React.ReactNode
  swUrl?: string
}) {
  // Skip SW registration in dev/test to avoid cache issues
  if (isDevOrTest) {
    return <>{children}</>
  }

  return <SerwistProviderBase swUrl={swUrl}>{children}</SerwistProviderBase>
}
