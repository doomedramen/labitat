import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

type GlancesTimeseriesData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  cpuHistory: number[]
  memHistory: number[]
}

function GlancesTimeseriesWidget({
  cpuHistory,
  memHistory,
}: GlancesTimeseriesData) {
  const avgCpu =
    cpuHistory.length > 0
      ? Math.round(cpuHistory.reduce((a, b) => a + b, 0) / cpuHistory.length)
      : 0
  const avgMem =
    memHistory.length > 0
      ? Math.round(memHistory.reduce((a, b) => a + b, 0) / memHistory.length)
      : 0

  return (
    <StatGrid
      items={[
        { value: `${avgCpu}%`, label: "Avg CPU" },
        { value: `${avgMem}%`, label: "Avg RAM" },
        { value: cpuHistory.length, label: "Samples" },
      ]}
    />
  )
}

export const glancesTimeseriesDefinition: ServiceDefinition<GlancesTimeseriesData> =
  {
    id: "glances-timeseries",
    name: "Glances Timeseries",
    icon: "glances",
    category: "monitoring",
    defaultPollingMs: 15_000,
    configFields: [
      {
        key: "url",
        label: "URL",
        type: "url",
        required: true,
        placeholder: "https://glances.example.org",
      },
      {
        key: "username",
        label: "Username",
        type: "text",
        required: false,
      },
      {
        key: "password",
        label: "Password",
        type: "password",
        required: false,
      },
    ],
    async fetchData(config) {
      const baseUrl = config.url.replace(/\/$/, "")
      const headers: Record<string, string> = {}

      if (config.username && config.password) {
        headers["Authorization"] =
          `Basic ${btoa(`${config.username}:${config.password}`)}`
      }

      const res = await fetch(`${baseUrl}/api/4/history`, { headers })
      if (!res.ok) throw new Error(`Glances error: ${res.status}`)

      const data = await res.json()
      const history = data.history ?? []

      // Get last 20 samples
      const recent = history.slice(-20)
      const cpuHistory = recent.map((h: { cpu: number }) =>
        Math.round(h.cpu ?? 0)
      )
      const memHistory = recent.map((h: { mem: number }) =>
        Math.round(h.mem ?? 0)
      )

      return {
        _status: "ok",
        cpuHistory,
        memHistory,
      }
    },
    Widget: GlancesTimeseriesWidget,
  }
