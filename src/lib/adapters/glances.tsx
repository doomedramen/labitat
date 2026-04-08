import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

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
  const cpuColor = cpuPercent > 90 ? "text-destructive" : undefined
  const memColor = memPercent > 90 ? "text-destructive" : undefined

  return (
    <StatGrid
      items={[
        { value: `${cpuPercent}%`, label: "CPU", valueClassName: cpuColor },
        { value: `${memPercent}%`, label: "RAM", valueClassName: memColor },
        { value: memUsed, label: "Memory" },
        { value: `${swapPercent}%`, label: "Swap" },
        { value: load1.toFixed(2), label: "Load" },
        { value: uptime, label: "Uptime" },
      ]}
    />
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

    const res = await fetch(`${baseUrl}/api/4/quicklook`, { headers })
    if (!res.ok) throw new Error(`Glances error: ${res.status}`)

    const data = await res.json()

    return {
      _status: "ok",
      cpuPercent: Math.round(data.cpu ?? 0),
      memPercent: Math.round(data.mem ?? 0),
      memUsed: `${formatBytes(((data.mem ?? 0) * (data.memory_total ?? 0)) / 100)}`,
      swapPercent: Math.round(data.swap ?? 0),
      load1: data.load?.cpucore
        ? (data.load?.min1 ?? 0) / (data.load?.cpucore ?? 1)
        : (data.load?.min1 ?? 0),
      uptime: formatUptime(data.uptime ?? 0),
    }
  },
  Widget: GlancesWidget,
}
