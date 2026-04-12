import { db } from "@/lib/db"
import { items } from "@/lib/db/schema"
import { decrypt } from "@/lib/crypto"
import { getService } from "@/lib/adapters"
import { serverCache } from "./server-cache"

const GRACE_PERIOD_MS = 5 * 60 * 1000 // 5 minutes

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
    for (const [id, job] of this.jobs) {
      clearTimeout(job.timer)
      this.jobs.delete(id)
    }
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
          // Ping URL
          try {
            const controller = new AbortController()
            const timeout = setTimeout(() => controller.abort(), 5000)
            const res = await fetch(item.href!, {
              method: "GET",
              signal: controller.signal,
              redirect: "manual",
            })
            clearTimeout(timeout)
            serverCache.set(item.id, {
              pingStatus:
                res.status > 0
                  ? { state: "reachable" }
                  : {
                      state: "error" as const,
                      reason: `HTTP ${res.status}`,
                      httpStatus: res.status,
                    },
            })
          } catch {
            serverCache.set(item.id, {
              pingStatus: { state: "unreachable", reason: "Request failed" },
            })
          }
        }
      } catch (err) {
        serverCache.set(item.id, {
          widgetData: {
            _status: "error",
            _statusText: err instanceof Error ? err.message : "Failed to fetch",
          },
        })
      }

      // Schedule next poll
      if (this.jobs.has(item.id)) {
        this.jobs.get(item.id)!.timer = setTimeout(poll, pollingMs)
      }
    }

    // Start immediately
    const timer = setTimeout(poll, 0)
    this.jobs.set(item.id, { itemId: item.id, pollingMs, timer })
  }

  /** Get current connection count */
  getConnectionCount(): number {
    return this.activeConnections
  }
}

export const pollingManager = new PollingManager()
