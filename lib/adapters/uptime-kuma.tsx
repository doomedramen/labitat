import type { ServiceDefinition } from "./types"

type UptimeKumaData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  up: number
  down: number
  uptime: string
}

function UptimeKumaWidget({ up, down, uptime }: UptimeKumaData) {
  const items = [
    { value: up, label: "Up" },
    { value: down, label: "Down" },
    { value: uptime, label: "Uptime" },
  ]

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-1.5 text-xs">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1 text-center"
        >
          <span className="font-medium text-foreground tabular-nums">
            {item.value}
          </span>
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export const uptimeKumaDefinition: ServiceDefinition<UptimeKumaData> = {
  id: "uptime-kuma",
  name: "Uptime Kuma",
  icon: "uptime-kuma",
  category: "monitoring",
  defaultPollingMs: 15_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://uptime.home.lab",
      helperText: "The base URL of your Uptime Kuma instance",
    },
    {
      key: "slug",
      label: "Status Page Slug",
      type: "text",
      required: false,
      placeholder: "default",
      helperText: "Status page slug (default: default)",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const slug = config.slug ?? "default"

    // Uptime Kuma uses REST API (like Homepage)
    const [statusRes, heartbeatRes] = await Promise.all([
      fetch(`${baseUrl}/api/status-page?slug=${slug}`),
      fetch(`${baseUrl}/api/status-page/heartbeat?slug=${slug}`),
    ])

    if (!statusRes.ok || !heartbeatRes.ok) {
      throw new Error("Failed to fetch Uptime Kuma data")
    }

    const statusData = await statusRes.json()
    const heartbeatData = await heartbeatRes.json()

    // Count sites up/down from heartbeat list
    let sitesUp = 0
    let sitesDown = 0

    const heartbeatList = heartbeatData.heartbeatList as
      | Record<string, { status: number }[]>
      | undefined
    if (heartbeatList) {
      Object.values(heartbeatList).forEach((siteList) => {
        const lastHeartbeat = siteList[siteList.length - 1]
        if (lastHeartbeat?.status === 1) {
          sitesUp++
        } else {
          sitesDown++
        }
      })
    }

    // Calculate average uptime
    const uptimeList = Object.values(heartbeatData.uptimeList ?? {}) as number[]
    const avgUptime =
      uptimeList.length > 0
        ? (
            (uptimeList.reduce((a, b) => a + b, 0) / uptimeList.length) *
            100
          ).toFixed(1)
        : "0"

    return {
      _status: "ok" as const,
      up: sitesUp,
      down: sitesDown,
      uptime: `${avgUptime}%`,
    }
  },

  Widget: UptimeKumaWidget,
}
