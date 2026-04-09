import type { ServiceDefinition } from "./types"
import { WidgetStatGrid } from "@/components/dashboard/item/widget-stat-grid"
import { Check, X, Clock } from "lucide-react"

type UptimeKumaData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  up: number
  down: number
  uptime: string
}

function UptimeKumaWidget({ up, down, uptime }: UptimeKumaData) {
  const items = [
    {
      id: "up",
      value: String(up),
      label: "Up",
      icon: <Check className="h-3 w-3" />,
    },
    {
      id: "down",
      value: String(down),
      label: "Down",
      icon: <X className="h-3 w-3" />,
    },
    {
      id: "uptime",
      value: String(uptime),
      label: "Uptime",
      icon: <Clock className="h-3 w-3" />,
    },
  ]

  return <WidgetStatGrid items={items} />
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
      placeholder: "https://uptime-kuma.example.org",
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
    const [_statusRes, heartbeatRes] = await Promise.all([
      fetch(`${baseUrl}/api/status-page?slug=${slug}`),
      fetch(`${baseUrl}/api/status-page/heartbeat?slug=${slug}`),
    ])

    if (!_statusRes.ok || !heartbeatRes.ok) {
      throw new Error("Failed to fetch Uptime Kuma data")
    }

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
