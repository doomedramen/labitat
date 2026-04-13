import type { ServiceDefinition } from "./types";
import { LayoutDashboard, Database, Bell, AlertTriangle } from "lucide-react";

type GrafanaData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  dashboards: number;
  datasources: number;
  totalAlerts: number;
  alertsTriggered: number;
};
import { fetchWithTimeout } from "./fetch-with-timeout";

function grafanaToPayload(data: GrafanaData) {
  return {
    stats: [
      {
        id: "dashboards",
        value: (data.dashboards ?? 0).toLocaleString(),
        label: "Dashboards",
        icon: LayoutDashboard,
      },
      {
        id: "datasources",
        value: (data.datasources ?? 0).toLocaleString(),
        label: "Datasources",
        icon: Database,
      },
      {
        id: "total-alerts",
        value: (data.totalAlerts ?? 0).toLocaleString(),
        label: "Total Alerts",
        icon: Bell,
      },
      {
        id: "alerts-triggered",
        value: (data.alertsTriggered ?? 0).toLocaleString(),
        label: "Alerts Triggered",
        icon: AlertTriangle,
      },
    ],
  };
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
      placeholder: "https://grafana.example.org",
      helperText: "The base URL of your Grafana instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Grafana password or API key",
      helperText: "Found in Configuration → Service Accounts",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "");
    const headers = {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    };

    // Fetch stats and alerts (like Homepage)
    const [statsRes, alertsRes] = await Promise.all([
      fetchWithTimeout(`${baseUrl}/api/admin/stats`, { headers }),
      fetchWithTimeout(`${baseUrl}/api/alerts`, { headers }),
    ]);

    if (!statsRes.ok) {
      if (statsRes.status === 401) throw new Error("Invalid API key");
      if (statsRes.status === 404) throw new Error("Grafana not found at this URL");
      throw new Error(`Grafana error: ${statsRes.status}`);
    }

    const statsData = await statsRes.json();
    const alertsData = alertsRes.ok ? await alertsRes.json() : [];

    // Count alerts in alerting state (matching Homepage)
    const alertsTriggered = alertsData.filter(
      (a: { state: string }) => a.state === "alerting",
    ).length;

    return {
      _status: "ok" as const,
      dashboards: statsData.dashboards ?? 0,
      datasources: statsData.datasources ?? 0,
      totalAlerts: statsData.alerts ?? 0,
      alertsTriggered,
    };
  },

  toPayload: grafanaToPayload,
};
