import type { ServiceDefinition } from "./types"
import { Loader, List, CheckCircle, Trophy } from "lucide-react"

type UnmanicData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  activeWorkers: number
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
        icon: <Loader className="h-3 w-3" />,
      },
      {
        id: "queued",
        value: data.queuedItems,
        label: "Queued",
        icon: <List className="h-3 w-3" />,
      },
      {
        id: "today",
        value: data.completedToday,
        label: "Today",
        icon: <CheckCircle className="h-3 w-3" />,
      },
      {
        id: "total",
        value: data.totalCompleted,
        label: "Total",
        icon: <Trophy className="h-3 w-3" />,
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

    const res = await fetch(`${baseUrl}/unmanic/api/v1/status`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ api_key: config.apiKey }),
    })

    if (!res.ok) throw new Error(`Unmanic error: ${res.status}`)

    const data = await res.json()
    const status = data.status ?? {}

    return {
      _status: "ok",
      activeWorkers: status.active_workers ?? 0,
      queuedItems: status.queue_length ?? 0,
      completedToday: status.completed_today ?? 0,
      totalCompleted: status.total_completed ?? 0,
    }
  },
  toPayload: unmanicToPayload,
}
