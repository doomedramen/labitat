import type { ServiceDefinition } from "./types"

type AdGuardData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  queries: number
  blocked: number
  filtered: number
  latency: number
}

function AdGuardWidget({ queries, blocked, filtered, latency }: AdGuardData) {
  const items = [
    { value: queries.toLocaleString(), label: "Queries" },
    { value: blocked.toLocaleString(), label: "Blocked" },
    { value: filtered.toLocaleString(), label: "Filtered" },
    { value: `${latency.toFixed(0)}ms`, label: "Latency" },
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

export const adguardDefinition: ServiceDefinition<AdGuardData> = {
  id: "adguard",
  name: "AdGuard Home",
  icon: "adguard-home",
  category: "networking",
  defaultPollingMs: 10_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "http://192.168.1.2",
      helperText: "The base URL of your AdGuard Home instance",
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

    // AdGuard uses basic auth for API calls
    const auth = Buffer.from(`${config.username}:${config.password}`).toString(
      "base64"
    )
    const headers = { Authorization: `Basic ${auth}` }

    // Get stats (like Homepage)
    const statsRes = await fetch(`${baseUrl}/control/stats`, { headers })

    if (!statsRes.ok) {
      if (statsRes.status === 401)
        throw new Error("Invalid username or password")
      if (statsRes.status === 404)
        throw new Error("AdGuard not found at this URL")
      throw new Error(`AdGuard error: ${statsRes.status}`)
    }

    const statsData = await statsRes.json()

    // Calculate filtered (matching Homepage logic)
    const filtered =
      (statsData.num_replaced_safebrowsing ?? 0) +
      (statsData.num_replaced_safesearch ?? 0) +
      (statsData.num_replaced_parental ?? 0)

    return {
      _status: "ok" as const,
      queries: statsData.num_dns_queries ?? 0,
      blocked: statsData.num_blocked_filtering ?? 0,
      filtered,
      latency: (statsData.avg_processing_time ?? 0) * 1000,
    }
  },

  Widget: AdGuardWidget,
}
