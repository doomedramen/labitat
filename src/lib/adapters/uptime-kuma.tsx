import type { ServiceDefinition } from "./types";
import type { StatItem } from "@/components/widgets";
import { Check, X, Clock, AlertTriangle } from "lucide-react";

type UptimeKumaData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  up: number;
  down: number;
  uptime: string;
  incident?: {
    title: string;
    createdDate: string;
    hoursAgo: number;
  };
};
import { fetchWithTimeout } from "./fetch-with-timeout";

function uptimeKumaToPayload(data: UptimeKumaData) {
  const stats: StatItem[] = [
    {
      id: "up",
      value: String(data.up),
      label: "Up",
      icon: Check,
    },
    {
      id: "down",
      value: String(data.down),
      label: "Down",
      icon: X,
    },
    {
      id: "uptime",
      value: String(data.uptime),
      label: "Uptime",
      icon: Clock,
    },
  ];

  // Add incident stat if there's an active incident
  if (data.incident) {
    stats.push({
      id: "incident",
      value: `${Math.round(data.incident.hoursAgo)}h ago`,
      label: "Incident",
      icon: AlertTriangle,
      tooltip: data.incident.title,
    });
  }

  return { stats };
}

export const uptimeKumaDefinition: ServiceDefinition<UptimeKumaData> = {
  id: "uptime-kuma",
  name: "Uptime Kuma",
  icon: "uptime-kuma",
  category: "monitoring",
  defaultPollingMs: 15_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://uptime-kuma.example.org",
      helperText: "The base URL of your Uptime Kuma instance",
    },
    {
      key: "slug",
      label: "Status Page Slug",
      type: "text",
      required: false,
      placeholder: "default",
      helperText: "Status page slug (default: default)",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "");
    const slug = config.slug ?? "default";

    // Uptime Kuma uses REST API (like Homepage)
    const [_statusRes, heartbeatRes] = await Promise.all([
      fetchWithTimeout(`${baseUrl}/api/status-page?slug=${slug}`),
      fetchWithTimeout(`${baseUrl}/api/status-page/heartbeat?slug=${slug}`),
    ]);

    if (!_statusRes.ok || !heartbeatRes.ok) {
      throw new Error("Failed to fetch Uptime Kuma data");
    }

    const statusData = await _statusRes.json();
    const heartbeatData = await heartbeatRes.json();

    // Count sites up/down from heartbeat list
    let sitesUp = 0;
    let sitesDown = 0;

    const heartbeatList = heartbeatData.heartbeatList as
      | Record<string, { status: number }[]>
      | undefined;
    if (heartbeatList) {
      Object.values(heartbeatList).forEach((siteList) => {
        const lastHeartbeat = siteList[siteList.length - 1];
        if (lastHeartbeat?.status === 1) {
          sitesUp++;
        } else {
          sitesDown++;
        }
      });
    }

    // Calculate average uptime
    const uptimeList = Object.values(heartbeatData.uptimeList ?? {}) as number[];
    const avgUptime =
      uptimeList.length > 0
        ? ((uptimeList.reduce((a, b) => a + b, 0) / uptimeList.length) * 100).toFixed(1)
        : "0";

    // Check for active incidents (matches Homepage's implementation)
    const incident = statusData.incident
      ? {
          title: statusData.incident.title ?? "Unknown Incident",
          createdDate: statusData.incident.createdDate,
          hoursAgo:
            Math.abs(new Date(statusData.incident.createdDate).getTime() - Date.now()) /
            1000 /
            (60 * 60),
        }
      : undefined;

    return {
      _status: "ok" as const,
      up: sitesUp,
      down: sitesDown,
      uptime: `${avgUptime}%`,
      incident,
    };
  },

  toPayload: uptimeKumaToPayload,
};
