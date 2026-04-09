import type { ServiceDefinition } from "./types"
import { ResourceBar } from "@/components/widgets"
import { WidgetStatGrid } from "@/components/dashboard/item/widget-stat-grid"
import { ArrowDownUp, Activity, Clock } from "lucide-react"

type GlancesData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  cpuPercent: number
  memPercent: number
  memUsed: string
  swapPercent: number
  load1: number
  uptime: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  if (days > 0) return `${days}d ${hours}h`
  const mins = Math.floor((seconds % 3600) / 60)
  return `${hours}h ${mins}m`
}

function GlancesWidget({
  cpuPercent,
  memPercent,
  memUsed,
  swapPercent,
  load1,
  uptime,
}: GlancesData) {
  const cpu = cpuPercent ?? 0
  const mem = memPercent ?? 0
  const swap = swapPercent ?? 0
  const load = load1 ?? 0

  return (
    <div className="flex flex-col gap-2 text-xs">
      <ResourceBar label="CPU" value={cpu} />
      <ResourceBar label="RAM" value={mem} hint={memUsed} />
      <WidgetStatGrid
        items={[
          {
            id: "swap",
            value: `${swap}%`,
            label: "Swap",
            icon: <ArrowDownUp className="h-3 w-3" />,
          },
          {
            id: "load",
            value: load.toFixed(2),
            label: "Load",
            icon: <Activity className="h-3 w-3" />,
          },
          {
            id: "uptime",
            value: uptime ?? "—",
            label: "Uptime",
            icon: <Clock className="h-3 w-3" />,
          },
        ]}
      />
    </div>
  )
}

export const glancesDefinition: ServiceDefinition<GlancesData> = {
  id: "glances",
  name: "Glances",
  icon: "glances",
  category: "monitoring",
  defaultPollingMs: 10_000,
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
      placeholder: "Leave blank if no auth",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: false,
      placeholder: "Leave blank if no auth",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers: Record<string, string> = {}

    if (config.username && config.password) {
      headers["Authorization"] =
        `Basic ${btoa(`${config.username}:${config.password}`)}`
    }

    const [quickRes, memRes] = await Promise.all([
      fetch(`${baseUrl}/api/4/quicklook`, { headers }),
      fetch(`${baseUrl}/api/4/mem`, { headers }),
    ])

    if (!quickRes.ok) throw new Error(`Glances error: ${quickRes.status}`)

    const data = await quickRes.json()
    const memData = memRes.ok ? await memRes.json() : {}

    // Memory used: prefer /api/4/mem, fall back to quicklook calculation
    const memUsedBytes =
      memData.used ??
      (data.memory_total ? ((data.mem ?? 0) * data.memory_total) / 100 : 0)

    // Load: quicklook may return an object {min1, cpucore} or a bare number
    const loadRaw = data.load ?? 0
    const loadMin1 = typeof loadRaw === "object" ? (loadRaw.min1 ?? 0) : loadRaw
    const loadCores = typeof loadRaw === "object" ? (loadRaw.cpucore ?? 1) : 1
    const load1 = loadCores > 1 ? loadMin1 / loadCores : loadMin1

    // Uptime: may be seconds (number) or a pre-formatted string
    const uptimeRaw = data.uptime ?? 0
    const uptime =
      typeof uptimeRaw === "string"
        ? uptimeRaw.replace(/^"|"$/g, "").trim() || "—"
        : formatUptime(uptimeRaw)

    return {
      _status: "ok",
      cpuPercent: Math.round(data.cpu ?? 0),
      memPercent: Math.round(data.mem ?? 0),
      memUsed: memUsedBytes > 0 ? formatBytes(memUsedBytes) : "—",
      swapPercent: Math.round(data.swap ?? 0),
      load1,
      uptime,
    }
  },
  Widget: GlancesWidget,
}
