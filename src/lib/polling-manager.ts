import { db } from "@/lib/db"
import { items } from "@/lib/db/schema"
import { decrypt } from "@/lib/crypto"
import { getService } from "@/lib/adapters"
import { fetchWithTimeout } from "@/lib/adapters/fetch-with-timeout"
import { serverCache } from "./server-cache"

const GRACE_PERIOD_MS = 5 * 60 * 1000 // 5 minutes
const PING_TIMEOUT_MS = 10_000

type PollJob = {
  itemId: string
  pollingMs: number
  timer: ReturnType<typeof setTimeout>
}

class PollingManager {
  private jobs = new Map<string, PollJob>()
  private activeConnections = 0
  private graceTimer: ReturnType<typeof setTimeout> | null = null

  /** A client connected — start polling if needed */
  connect(): void {
    this.activeConnections++
    if (this.graceTimer) {
      clearTimeout(this.graceTimer)
      this.graceTimer = null
    }
    if (this.activeConnections === 1) {
      this.startAllPolling()
    }
  }

  /** A client disconnected — maybe stop polling after grace period */
  disconnect(): void {
    this.activeConnections = Math.max(0, this.activeConnections - 1)
    if (this.activeConnections === 0 && this.jobs.size > 0) {
      this.graceTimer = setTimeout(() => {
        this.stopAllPolling()
      }, GRACE_PERIOD_MS)
    }
  }

  /** Start polling for all items in the database */
  private async startAllPolling(): Promise<void> {
    try {
      const allItems = await db.select().from(items)
      for (const item of allItems) {
        if (item.serviceType || item.href) {
          this.startPollingItem(item)
        }
      }
    } catch (err) {
      console.error("[polling] Failed to start polling:", err)
    }
  }

  /** Stop all polling jobs */
  private stopAllPolling(): void {
    for (const [, job] of this.jobs) {
      clearTimeout(job.timer)
    }
    this.jobs.clear()
    console.log("[polling] All polling stopped (no active connections)")
  }

  /** Start polling for a single item */
  private startPollingItem(item: {
    id: string
    serviceType: string | null
    href: string | null
    serviceUrl: string | null
    configEnc: string | null
    pollingMs: number | null
  }): void {
    const adapter = item.serviceType ? getService(item.serviceType) : null
    const pollingMs = item.pollingMs ?? adapter?.defaultPollingMs ?? 30_000

    const poll = async () => {
      try {
        if (item.serviceType && adapter?.fetchData) {
          const config: Record<string, string> = {}
          if (item.serviceUrl) config.url = item.serviceUrl
          if (item.configEnc) {
            try {
              const decrypted = JSON.parse(await decrypt(item.configEnc))
              Object.assign(config, decrypted)
            } catch {
              serverCache.set(item.id, {
                widgetData: {
                  _status: "error",
                  _statusText: "Failed to decrypt credentials",
                },
              })
              return
            }
          }
          const data = await adapter.fetchData(config)
          serverCache.set(item.id, { widgetData: data })
        } else if (item.href) {
          try {
            const res = await fetchWithTimeout(
              item.href!,
              { method: "GET" },
              PING_TIMEOUT_MS
            )
            serverCache.set(item.id, {
              pingStatus: res.ok
                ? { state: "reachable" }
                : {
                    state: "error" as const,
                    reason: `HTTP ${res.status}`,
                    httpStatus: res.status,
                  },
            })
          } catch (err) {
            const isTimeout =
              err instanceof DOMException && err.name === "TimeoutError"
            serverCache.set(item.id, {
              pingStatus: isTimeout
                ? {
                    state: "slow" as const,
                    reason: "Request timed out",
                    timeoutMs: PING_TIMEOUT_MS,
                  }
                : {
                    state: "unreachable" as const,
                    reason: "Request failed",
                  },
            })
          }
        }
      } catch (err) {
        const isTimeout =
          err instanceof DOMException && err.name === "TimeoutError"
        const errorText = isTimeout
          ? "Request timed out"
          : err instanceof Error
            ? err.message
            : "Failed to fetch"

        const cached = serverCache.get(item.id)
        if (
          cached?.widgetData &&
          (cached.widgetData._status === "ok" ||
            cached.widgetData._status === "warn")
        ) {
          serverCache.set(item.id, {
            widgetData: {
              ...cached.widgetData,
              _status: "warn",
              _statusText: `${errorText} — showing cached data`,
            },
          })
        } else {
          serverCache.set(item.id, {
            widgetData: {
              _status: "error",
              _statusText: errorText,
            },
          })
        }
      }

      if (this.jobs.has(item.id)) {
        this.jobs.get(item.id)!.timer = setTimeout(poll, pollingMs)
      }
    }

    const timer = setTimeout(poll, 0)
    this.jobs.set(item.id, { itemId: item.id, pollingMs, timer })
  }

  getConnectionCount(): number {
    return this.activeConnections
  }
}

export const pollingManager = new PollingManager()
