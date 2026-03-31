import type { ServiceDefinition } from "./types"

type PiholeData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  queries: number
  blocked: number
  percentBlocked: string
  domainsBlocked: number
}

function PiholeWidget({
  queries,
  blocked,
  percentBlocked,
  domainsBlocked,
}: PiholeData) {
  const items = [
    { value: queries.toLocaleString(), label: "Queries" },
    { value: blocked.toLocaleString(), label: "Blocked" },
    { value: percentBlocked, label: "Blocked %" },
    { value: domainsBlocked.toLocaleString(), label: "Domains" },
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

export const piholeDefinition: ServiceDefinition<PiholeData> = {
  id: "pihole",
  name: "Pi-hole",
  icon: "pi-hole",
  category: "networking",
  defaultPollingMs: 10_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "http://192.168.1.2",
      helperText: "The base URL of your Pi-hole instance",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: true,
      placeholder: "Your Pi-hole web password",
      helperText: "Found in Settings → Web Interface → Password",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")

    // Pi-hole uses a password hash in the query string for API auth
    // First get the summary stats (public endpoint)
    const summaryRes = await fetch(`${baseUrl}/admin/api.php?summary`)

    if (!summaryRes.ok) {
      if (summaryRes.status === 404)
        throw new Error("Pi-hole not found at this URL")
      throw new Error(`Pi-hole error: ${summaryRes.status}`)
    }

    const summaryData = await summaryRes.json()

    // Get top items for blocked domains count
    const topItemsRes = await fetch(
      `${baseUrl}/admin/api.php?topItems&auth=${config.password}`
    )
    const topItemsData = topItemsRes.ok
      ? await topItemsRes.json()
      : { top_ads: {} }

    // Calculate percent blocked
    const totalQueries = summaryData.dns_queries_today ?? 0
    const blockedQueries = summaryData.ads_blocked_today ?? 0
    const percentBlocked =
      totalQueries > 0
        ? ((blockedQueries / totalQueries) * 100).toFixed(1)
        : "0"

    return {
      _status: "ok" as const,
      queries: totalQueries,
      blocked: blockedQueries,
      percentBlocked: `${percentBlocked}%`,
      domainsBlocked: Object.keys(topItemsData.top_ads ?? {}).length,
    }
  },

  Widget: PiholeWidget,
}
