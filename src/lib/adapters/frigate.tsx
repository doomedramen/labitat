import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

type FrigateData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  cameras: number
  uptime: number
  version: string
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  const hours = Math.floor((seconds % 86400) / 3600)
  const minutes = Math.floor((seconds % 3600) / 60)

  if (days > 0) return `${days}d ${hours}h`
  if (hours > 0) return `${hours}h ${minutes}m`
  return `${minutes}m`
}

function FrigateWidget({ cameras, uptime, version }: FrigateData) {
  const items = [
    { value: (cameras ?? 0).toLocaleString(), label: "Cameras" },
    { value: formatUptime(uptime ?? 0), label: "Uptime" },
    { value: version, label: "Version" },
  ]

  return <StatGrid items={items} />
}

export const frigateDefinition: ServiceDefinition<FrigateData> = {
  id: "frigate",
  name: "Frigate",
  icon: "frigate",
  category: "monitoring",
  defaultPollingMs: 30_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://frigate.example.org",
      helperText: "The base URL of your Frigate instance",
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: false,
      placeholder: "admin",
      helperText: "Required if Frigate has authentication enabled",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: false,
      placeholder: "Your Frigate password or API key",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    // If credentials provided, login first
    if (config.username && config.password) {
      const loginRes = await fetch(`${baseUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: config.username,
          password: config.password,
        }),
      })

      if (!loginRes.ok) {
        throw new Error("Failed to authenticate with Frigate")
      }

      const cookie = loginRes.headers.get("set-cookie")
      if (cookie) {
        headers.Cookie = cookie
      }
    }

    // Fetch stats
    const statsRes = await fetch(`${baseUrl}/api/stats`, { headers })

    if (!statsRes.ok) {
      if (statsRes.status === 401) throw new Error("Invalid credentials")
      if (statsRes.status === 404)
        throw new Error("Frigate not found at this URL")
      throw new Error(`Frigate error: ${statsRes.status}`)
    }

    const statsData = await statsRes.json()

    return {
      _status: "ok" as const,
      cameras:
        statsData?.cameras !== undefined
          ? Object.keys(statsData.cameras).length
          : 0,
      uptime: statsData?.service?.uptime ?? 0,
      version: statsData?.service?.version ?? "unknown",
    }
  },

  Widget: FrigateWidget,
}
