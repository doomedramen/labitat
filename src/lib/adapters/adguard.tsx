import type { ServiceDefinition } from "./types"
import { Globe, Ban, Percent, Shield, Search, Clock } from "lucide-react"

type AdGuardData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  queries: number
  blocked: number
  blockedPercent: number
  parentalBlocked: number
  safeSearchBlocked: number
  latency: number
}

function adguardToPayload(data: AdGuardData) {
  return {
    stats: [
      {
        id: "queries",
        value: (data.queries ?? 0).toLocaleString(),
        label: "Queries",
        icon: Globe,
      },
      {
        id: "blocked",
        value: (data.blocked ?? 0).toLocaleString(),
        label: "Blocked",
        icon: Ban,
      },
      {
        id: "rate",
        value: `${(data.blockedPercent ?? 0).toFixed(1)}%`,
        label: "Rate",
        icon: Percent,
      },
      {
        id: "parental",
        value: (data.parentalBlocked ?? 0).toLocaleString(),
        label: "Parental",
        icon: Shield,
      },
      {
        id: "safe",
        value: (data.safeSearchBlocked ?? 0).toLocaleString(),
        label: "Safe",
        icon: Search,
      },
      {
        id: "latency",
        value: `${data.latency}ms`,
        label: "Latency",
        icon: Clock,
      },
    ],
  }
}

export const adguardDefinition: ServiceDefinition<AdGuardData> = {
  id: "adguard",
  name: "AdGuard Home",
  icon: "adguard-home",
  category: "networking",
  defaultPollingMs: 15_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://adguard.example.org",
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: true,
      placeholder: "admin",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: true,
      placeholder: "Your AdGuard password",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const auth = btoa(`${config.username}:${config.password}`)
    const headers = { Authorization: `Basic ${auth}` }

    const startTime = Date.now()
    const [statsRes] = await Promise.all([
      fetch(`${baseUrl}/control/stats`, { headers }),
    ])
    const latency = Date.now() - startTime

    if (!statsRes.ok) throw new Error(`AdGuard error: ${statsRes.status}`)

    const stats = await statsRes.json()

    const totalQueries = stats.num_dns_queries ?? 0
    const totalBlocked = stats.num_blocked_filtering ?? 0
    const blockedPercent =
      totalQueries > 0 ? (totalBlocked / totalQueries) * 100 : 0

    return {
      _status: "ok",
      queries: totalQueries,
      blocked: totalBlocked,
      blockedPercent: Math.round(blockedPercent * 10) / 10,
      parentalBlocked: stats.num_blocked_parental ?? 0,
      safeSearchBlocked: stats.num_blocked_safe_search ?? 0,
      latency,
    }
  },
  toPayload: adguardToPayload,
}
