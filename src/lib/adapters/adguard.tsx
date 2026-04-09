import type { ServiceDefinition } from "./types"
import { WidgetStatGrid } from "@/components/dashboard/item/widget-stat-grid"
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

function AdGuardWidget({
  queries,
  blocked,
  blockedPercent,
  parentalBlocked,
  safeSearchBlocked,
  latency,
}: AdGuardData) {
  const items = [
    {
      id: "queries",
      value: queries,
      label: "Queries",
      icon: <Globe className="h-3 w-3" />,
    },
    {
      id: "blocked",
      value: blocked,
      label: "Blocked",
      icon: <Ban className="h-3 w-3" />,
    },
    {
      id: "rate",
      value: `${blockedPercent.toFixed(1)}%`,
      label: "Rate",
      icon: <Percent className="h-3 w-3" />,
    },
    {
      id: "parental",
      value: parentalBlocked,
      label: "Parental",
      icon: <Shield className="h-3 w-3" />,
    },
    {
      id: "safe",
      value: safeSearchBlocked,
      label: "Safe",
      icon: <Search className="h-3 w-3" />,
    },
    {
      id: "latency",
      value: `${latency}ms`,
      label: "Latency",
      icon: <Clock className="h-3 w-3" />,
    },
  ]

  return <WidgetStatGrid items={items} />
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
  Widget: AdGuardWidget,
}
