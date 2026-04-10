"use server"

import { cachePingStatus } from "@/lib/last-datapoints"
import { requireAuth } from "@/lib/auth/guard"
import type { ServiceStatus } from "@/lib/adapters/types"

export async function pingUrl(url: string): Promise<ServiceStatus> {
  await requireAuth()
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    const res = await fetch(url, {
      method: "GET",
      signal: controller.signal,
      redirect: "manual",
    })

    clearTimeout(timeout)

    if (res.status > 0) {
      return { state: "reachable" }
    }

    return {
      state: "error",
      reason: `HTTP ${res.status} ${res.statusText}`,
      httpStatus: res.status,
    }
  } catch (err) {
    if (err instanceof Error) {
      if (err.name === "AbortError") {
        return { state: "unreachable", reason: "Request timed out" }
      }
      if (err.message.includes("ENOTFOUND")) {
        return { state: "unreachable", reason: "DNS lookup failed" }
      }
      if (err.message.includes("ECONNREFUSED")) {
        return { state: "unreachable", reason: "Connection refused" }
      }
      if (
        err.message.includes("CERT_") ||
        err.message.includes("UNABLE_TO_VERIFY_LEAF_SIGNATURE") ||
        err.message.includes("DEPTH_ZERO_SELF_SIGNED_CERT") ||
        err.message.includes("self-signed") ||
        err.message.includes("certificate")
      ) {
        return {
          state: "error",
          reason:
            "SSL certificate error - certificate may be self-signed or invalid",
        }
      }
      return { state: "unreachable", reason: err.message }
    }
    return { state: "unreachable", reason: "Unknown error" }
  }
}

export async function pingAndCache(
  itemId: string,
  url: string
): Promise<ServiceStatus> {
  await requireAuth()
  const status = await pingUrl(url)
  await cachePingStatus(itemId, status)
  return status
}
