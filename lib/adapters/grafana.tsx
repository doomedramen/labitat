import type { ServiceDefinition } from "./types"

type GrafanaData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  alerts: number
  firing: number
  pending: number
  dashboards: number
}

function GrafanaWidget({ alerts, firing, pending, dashboards }: GrafanaData) {
  const items = [
    { value: alerts, label: "Alerts" },
    { value: firing, label: "Firing" },
    { value: pending, label: "Pending" },
    { value: dashboards, label: "Dashboards" },
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

    // Fetch alerts and dashboards
    const [alertsRes, dashboardsRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/provisioning/alert-rules`, { headers }),
      fetch(`${baseUrl}/api/search?type=dash-db`, { headers }),
    ])

    // Grafana API may not have provisioning API enabled, handle gracefully
    let alertsData = []
    if (alertsRes.ok) {
      alertsData = await alertsRes.json()
    }

    if (!dashboardsRes.ok) {
      if (dashboardsRes.status === 401) throw new Error("Invalid API key")
      if (dashboardsRes.status === 404)
        throw new Error("Grafana not found at this URL")
      throw new Error(`Grafana error: ${dashboardsRes.status}`)
    }

    const dashboardsData = await dashboardsRes.json()

    // Count alert states
    const firing = alertsData.filter(
      (a: { state: string }) => a.state === "Firing"
    ).length
    const pending = alertsData.filter(
      (a: { state: string }) => a.state === "Pending"
    ).length
    const alerts = alertsData.length

    return {
      _status: "ok" as const,
      alerts,
      firing,
      pending,
      dashboards: dashboardsData.length,
    }
  },

  Widget: GrafanaWidget,
}
