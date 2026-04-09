import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

type AdGuardData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  queries: number
  blocked: number
  blockedPercent: number
  parentalBlocked: number
  safeSearchBlocked: number
  latency?: number
  showQueries?: boolean
  showBlocked?: boolean
  showBlockedPercent?: boolean
  showParentalBlocked?: boolean
  showSafeSearchBlocked?: boolean
  showLatency?: boolean
}

function AdGuardWidget({
  queries,
  blocked,
  blockedPercent,
  parentalBlocked,
  safeSearchBlocked,
  latency,
  showQueries = true,
  showBlocked = true,
  showBlockedPercent = true,
  showParentalBlocked = false,
  showSafeSearchBlocked = false,
  showLatency = false,
}: AdGuardData) {
  const items = []

  if (showQueries) {
    items.push({ value: queries, label: "Queries" })
  }
  if (showBlocked) {
    items.push({ value: blocked, label: "Blocked" })
  }
  if (showBlockedPercent) {
    items.push({
      value: `${blockedPercent?.toFixed(1) ?? 0}%`,
      label: "Rate",
    })
  }
  if (showParentalBlocked) {
    items.push({ value: parentalBlocked, label: "Parental" })
  }
  if (showSafeSearchBlocked) {
    items.push({ value: safeSearchBlocked, label: "Safe" })
  }
  if (showLatency && latency !== undefined) {
    items.push({ value: `${latency}ms`, label: "Latency" })
  }

  return <StatGrid items={items} />
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
    {
      key: "showQueries",
      label: "Show Queries",
      type: "boolean",
      defaultChecked: true,
      helperText: "Display total DNS queries",
    },
    {
      key: "showBlocked",
      label: "Show Blocked",
      type: "boolean",
      defaultChecked: true,
      helperText: "Display blocked DNS queries",
    },
    {
      key: "showBlockedPercent",
      label: "Show Block Rate",
      type: "boolean",
      defaultChecked: true,
      helperText: "Display percentage of blocked queries",
    },
    {
      key: "showParentalBlocked",
      label: "Show Parental Controls",
      type: "boolean",
      defaultChecked: false,
      helperText: "Display queries blocked by parental controls",
    },
    {
      key: "showSafeSearchBlocked",
      label: "Show Safe Search",
      type: "boolean",
      defaultChecked: false,
      helperText: "Display queries forced to safe search",
    },
    {
      key: "showLatency",
      label: "Show Latency",
      type: "boolean",
      defaultChecked: false,
      helperText: "Display API response latency",
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
      showQueries: config.showQueries !== "false",
      showBlocked: config.showBlocked !== "false",
      showBlockedPercent: config.showBlockedPercent !== "false",
      showParentalBlocked: config.showParentalBlocked === "true",
      showSafeSearchBlocked: config.showSafeSearchBlocked === "true",
      showLatency: config.showLatency === "true",
    }
  },
  Widget: AdGuardWidget,
}
