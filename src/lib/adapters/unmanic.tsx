import type { ServiceDefinition } from "./types"
import { Loader, List, CheckCircle, Trophy, Users } from "lucide-react"

type UnmanicData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  activeWorkers: number
  totalWorkers: number
  queuedItems: number
  completedToday: number
  totalCompleted: number
}

function unmanicToPayload(data: UnmanicData) {
  return {
    stats: [
      {
        id: "active",
        value: data.activeWorkers,
        label: "Active",
        icon: Loader,
      },
      {
        id: "total",
        value: data.totalWorkers,
        label: "Total",
        icon: Users,
      },
      {
        id: "queued",
        value: data.queuedItems,
        label: "Queued",
        icon: List,
      },
      {
        id: "today",
        value: data.completedToday,
        label: "Today",
        icon: CheckCircle,
      },
      {
        id: "completed",
        value: data.totalCompleted,
        label: "Total",
        icon: Trophy,
      },
    ],
  }
}

export const unmanicDefinition: ServiceDefinition<UnmanicData> = {
  id: "unmanic",
  name: "Unmanic",
  icon: "unmanic",
  category: "media",
  defaultPollingMs: 10_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://unmanic.example.org",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: false,
      placeholder: "Your Unmanic API key (if enabled)",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }
    if (config.apiKey) {
      headers["X-API-Key"] = config.apiKey
    }

    // Try v2 API first (more detailed worker info)
    try {
      const [workersRes, pendingRes] = await Promise.all([
        fetch(`${baseUrl}/unmanic/api/v2/workers/status`, { headers }),
        fetch(`${baseUrl}/unmanic/api/v2/pending/tasks`, {
          method: "POST",
          headers,
          body: JSON.stringify({}),
        }),
      ])

      if (workersRes.ok && pendingRes.ok) {
        const workersData = await workersRes.json()
        const pendingData = await pendingRes.json()

        const workersStatus = workersData.workers_status ?? []
        const totalWorkers = workersStatus.length
        const activeWorkers = workersStatus.filter(
          (w: { idle?: boolean }) => !w.idle
        ).length

        return {
          _status: "ok",
          activeWorkers,
          totalWorkers,
          queuedItems: pendingData.recordsTotal ?? 0,
          completedToday: 0, // v2 API doesn't provide this, would need separate call
          totalCompleted: 0, // v2 API doesn't provide this
        }
      }
    } catch {
      // v2 API failed, fall back to v1
    }

    // Fallback to v1 API (backwards compatibility)
    const res = await fetch(`${baseUrl}/unmanic/api/v1/status`, {
      method: "POST",
      headers,
      body: JSON.stringify({ api_key: config.apiKey }),
    })

    if (!res.ok) throw new Error(`Unmanic error: ${res.status}`)

    const data = await res.json()
    const status = data.status ?? {}

    return {
      _status: "ok",
      activeWorkers: status.active_workers ?? 0,
      totalWorkers: status.active_workers ?? 0, // v1 doesn't provide total, assume active = total
      queuedItems: status.queue_length ?? 0,
      completedToday: status.completed_today ?? 0,
      totalCompleted: status.total_completed ?? 0,
    }
  },
  toPayload: unmanicToPayload,
}
