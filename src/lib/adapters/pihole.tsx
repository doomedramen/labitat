import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

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
    { value: (queries ?? 0).toLocaleString(), label: "Queries" },
    { value: (blocked ?? 0).toLocaleString(), label: "Blocked" },
    { value: percentBlocked, label: "Blocked %" },
    { value: (domainsBlocked ?? 0).toLocaleString(), label: "Domains" },
  ]

  return <StatGrid items={items} />
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
      placeholder: "https://pihole.example.org",
      helperText: "The base URL of your Pi-hole instance",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: true,
      placeholder: "Your Pi-hole password or API key",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")

    // Pi-hole v6 uses session-based auth, v5 uses password in query string
    // Try v6 API first with session auth
    let summaryData: Record<string, unknown> = {}

    // Try to get session token for v6 API
    const sessionRes = await fetch(`${baseUrl}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password: config.password }),
    })

    if (sessionRes.ok) {
      // v6 API available
      const sessionData = await sessionRes.json()
      const token = sessionData.session

      const summaryRes = await fetch(`${baseUrl}/api/stats/summary`, {
        headers: { Authorization: `Bearer ${token}` },
      })

      if (summaryRes.ok) {
        summaryData = await summaryRes.json()
      }
    } else {
      // Fall back to v5 API
      const summaryRes = await fetch(
        `${baseUrl}/admin/api.php?summaryRaw&auth=${config.password}`
      )

      if (!summaryRes.ok) {
        if (summaryRes.status === 404)
          throw new Error("Pi-hole not found at this URL")
        throw new Error(`Pi-hole error: ${summaryRes.status}`)
      }

      summaryData = await summaryRes.json()
    }

    return {
      _status: "ok" as const,
      queries: (summaryData.dns_queries_today as number) ?? 0,
      blocked: (summaryData.ads_blocked_today as number) ?? 0,
      percentBlocked: `${(summaryData.ads_percentage_today as number) ?? 0}%`,
      domainsBlocked: (summaryData.domains_being_blocked as number) ?? 0,
    }
  },

  Widget: PiholeWidget,
}
