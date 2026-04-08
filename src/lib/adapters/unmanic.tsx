import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

type UnmanicData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  activeWorkers: number
  queuedItems: number
  completedToday: number
  totalCompleted: number
}

function UnmanicWidget({
  activeWorkers,
  queuedItems,
  completedToday,
  totalCompleted,
}: UnmanicData) {
  return (
    <StatGrid
      items={[
        { value: activeWorkers, label: "Active" },
        { value: queuedItems, label: "Queued" },
        { value: completedToday, label: "Today" },
        { value: totalCompleted, label: "Total" },
      ]}
    />
  )
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
      required: true,
      placeholder: "Your Unmanic API key",
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
  Widget: UnmanicWidget,
}
