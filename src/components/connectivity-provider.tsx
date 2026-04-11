"use client"

import { useConnectivity } from "@/hooks/use-connectivity"

/**
 * Global connectivity monitor.
 * Renders nothing — only drives toast notifications for:
 * - Browser going offline
 * - Backend becoming unreachable
 * - Recovery from either state
 */
export function ConnectivityProvider() {
  useConnectivity()
  return null
}
