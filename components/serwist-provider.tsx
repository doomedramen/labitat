"use client"

import { SerwistProvider as SerwistProviderBase } from "@serwist/turbopack/react"

export function SerwistProvider({
  children,
  swUrl = "/serwist/sw.js",
}: {
  children: React.ReactNode
  swUrl?: string
}) {
  return <SerwistProviderBase swUrl={swUrl}>{children}</SerwistProviderBase>
}
