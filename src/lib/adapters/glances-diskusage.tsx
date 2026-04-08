import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

type GlancesDiskUsageData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  usedPercent: number
  used: string
  total: string
  free: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function GlancesDiskUsageWidget({
  usedPercent,
  used,
  total,
  free,
}: GlancesDiskUsageData) {
  const pct = usedPercent ?? 0

  const color =
    pct > 90 ? "text-destructive" : pct > 75 ? "text-amber-500" : undefined

  return (
    <StatGrid
      items={[
        { value: `${pct}%`, label: "Used", valueClassName: color },
        { value: used ?? "—", label: "Used Space" },
        { value: free ?? "—", label: "Free" },
        { value: total ?? "—", label: "Total" },
      ]}
    />
  )
}

export const glancesDiskUsageDefinition: ServiceDefinition<GlancesDiskUsageData> =
  {
    id: "glances-diskusage",
    name: "Glances Disk Usage",
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
      {
        key: "mountPoint",
        label: "Mount Point",
        type: "text",
        required: false,
        placeholder: "/",
        helperText: "Leave blank for root (/)",
      },
    ],
    async fetchData(config) {
      const baseUrl = config.url.replace(/\/$/, "")
      const headers: Record<string, string> = {}

      if (config.username && config.password) {
        headers["Authorization"] =
          `Basic ${btoa(`${config.username}:${config.password}`)}`
      }

      const mountPoint = config.mountPoint || "/"
      const res = await fetch(
        `${baseUrl}/api/4/fs/${encodeURIComponent(mountPoint)}`,
        { headers }
      )
      if (!res.ok) throw new Error(`Glances error: ${res.status}`)

      const data = await res.json()
      const total = data.size ?? 0
      const used = data.used ?? 0
      const free = data.free ?? 0
      const usedPercent = total > 0 ? Math.round((used / total) * 100) : 0

      return {
        _status: "ok",
        usedPercent,
        used: formatBytes(used),
        total: formatBytes(total),
        free: formatBytes(free),
      }
    },
    Widget: GlancesDiskUsageWidget,
  }
