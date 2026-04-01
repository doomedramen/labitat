"use server"

import type { ServiceStatus } from "@/lib/adapters/types"

export async function pingUrl(url: string): Promise<ServiceStatus> {
  try {
    const controller = new AbortController()
    const timeout = setTimeout(() => controller.abort(), 5000)

    let res = await fetch(url, {
      method: "HEAD",
      signal: controller.signal,
      redirect: "follow",
    })

    // Many servers (Proxmox, PBS, etc.) reject HEAD with 4xx — retry with GET
    if (!res.ok) {
      const getController = new AbortController()
      const getTimeout = setTimeout(() => getController.abort(), 5000)
      res = await fetch(url, {
        method: "GET",
        signal: getController.signal,
        redirect: "follow",
      })
      clearTimeout(getTimeout)
    }

    clearTimeout(timeout)

    if (res.ok) {
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
      return { state: "unreachable", reason: err.message }
    }
    return { state: "unreachable", reason: "Unknown error" }
  }
}
