import type { ServiceDefinition } from "./types"

type GrafanaData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  dashboards: number
  datasources: number
  totalAlerts: number
  alertsTriggered: number
}

function GrafanaWidget({
  dashboards,
  datasources,
  totalAlerts,
  alertsTriggered,
}: GrafanaData) {
  const items = [
    { value: dashboards, label: "Dashboards" },
    { value: datasources, label: "Datasources" },
    { value: totalAlerts, label: "Total Alerts" },
    { value: alertsTriggered, label: "Alerts Triggered" },
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

export const grafanaDefinition: ServiceDefinition<GrafanaData> = {
  id: "grafana",
  name: "Grafana",
  icon: "grafana",
  category: "monitoring",
  defaultPollingMs: 15_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://grafana.home.lab",
      helperText: "The base URL of your Grafana instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Grafana service account token",
      helperText: "Found in Configuration → Service Accounts",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    }

    // Fetch stats and alerts (like Homepage)
    const [statsRes, alertsRes] = await Promise.all([
      fetch(`${baseUrl}/api/admin/stats`, { headers }),
      fetch(`${baseUrl}/api/alerts`, { headers }),
    ])

    if (!statsRes.ok) {
      if (statsRes.status === 401) throw new Error("Invalid API key")
      if (statsRes.status === 404)
        throw new Error("Grafana not found at this URL")
      throw new Error(`Grafana error: ${statsRes.status}`)
    }

    const statsData = await statsRes.json()
    const alertsData = alertsRes.ok ? await alertsRes.json() : []

    // Count alerts in alerting state (matching Homepage)
    const alertsTriggered = alertsData.filter(
      (a: { state: string }) => a.state === "alerting"
    ).length

    return {
      _status: "ok" as const,
      dashboards: statsData.dashboards ?? 0,
      datasources: statsData.datasources ?? 0,
      totalAlerts: statsData.alerts ?? 0,
      alertsTriggered,
    }
  },

  Widget: GrafanaWidget,
}
