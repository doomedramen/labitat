import type { ServiceDefinition } from "./types";
import { Zap, Battery, Clock } from "lucide-react";

type APCUPSData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  loadPercent: number;
  batteryCharge: number;
  timeLeft: number;
  status: string;
};
import { fetchWithTimeout } from "./fetch-with-timeout";

function formatTimeLeft(minutes: number): string {
  if (minutes <= 0) return "0m";
  if (minutes < 1) return `${Math.round(minutes * 60)}s`;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function apcupsToPayload(data: APCUPSData) {
  const timeLeftMin = formatTimeLeft(data.timeLeft ?? 0);

  return {
    stats: [
      {
        id: "status",
        value: data.status ?? "Unknown",
        label: "Status",
        icon: Zap,
      },
      {
        id: "load",
        value: `${data.loadPercent ?? 0}%`,
        label: "Load",
        icon: Zap,
      },
      {
        id: "batterycharge",
        value: `${data.batteryCharge ?? 0}%`,
        label: "Battery Charge",
        icon: Battery,
      },
      {
        id: "timeleft",
        value: timeLeftMin,
        label: "Time Left",
        icon: Clock,
      },
    ],
  };
}

export const apcupsDefinition: ServiceDefinition<APCUPSData> = {
  id: "apcups",
  name: "APC UPS",
  icon: "apc",
  category: "monitoring",
  defaultPollingMs: 15_000,
  configFields: [
    {
      key: "connectionType",
      label: "Connection Type",
      type: "select",
      required: true,
      options: [
        { value: "tcp", label: "TCP Daemon (port 3551)" },
        { value: "http", label: "HTTP CGI (multimon.cgi)" },
      ],
      helperText: "TCP Daemon is recommended — most users don't have the CGI web interface enabled",
    },
    {
      key: "host",
      label: "Host",
      type: "text",
      required: true,
      placeholder: "192.168.1.100",
      helperText: "IP address or hostname of your APC UPS server",
    },
    {
      key: "port",
      label: "Port (TCP only)",
      type: "number",
      required: false,
      placeholder: "3551",
      helperText: "apcupsd TCP daemon port (default: 3551)",
    },
    {
      key: "url",
      label: "HTTP URL (HTTP only)",
      type: "url",
      required: false,
      placeholder: "http://192.168.1.100",
      helperText: "HTTP URL of your apcupsd web CGI server (if using HTTP CGI)",
    },
  ],
  async fetchData(config) {
    const connectionType = config.connectionType ?? "tcp";

    if (connectionType === "tcp") {
      // TCP daemon connection (recommended)
      const host = config.host;
      const port = parseInt(config.port ?? "3551", 10);

      if (!host) {
        throw new Error("Host is required for TCP connection");
      }

      try {
        // Import server-only TCP utility
        const { fetchApcupsTcpStatus } = await import("@/lib/apcups-tcp");
        const { loadPercent, batteryCharge, timeLeft, status } = await fetchApcupsTcpStatus(
          host,
          port,
        );

        return {
          _status: status.includes("ONLINE") ? "ok" : "warn",
          _statusText: status.includes("ONLINE") ? undefined : `UPS Status: ${status}`,
          loadPercent,
          batteryCharge,
          timeLeft,
          status,
        };
      } catch (error) {
        throw new Error(
          `TCP connection to ${host}:${port} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
        );
      }
    } else {
      // HTTP CGI fallback (original method)
      const baseUrl = (config.url ?? "").replace(/\/$/, "");

      if (!baseUrl) {
        throw new Error("URL is required for HTTP CGI connection");
      }

      const res = await fetchWithTimeout(`${baseUrl}/multimon.cgi`);

      if (!res.ok) throw new Error(`APC UPS error: ${res.status}`);

      const html = await res.text();

      const extractValue = (label: string): string => {
        const regex = new RegExp(`${label}[^<]*<[^>]*>([^<]+)</`, "i");
        const match = html.match(regex);
        return match?.[1]?.trim() ?? "";
      };

      const loadPercent = parseFloat(extractValue("LOADPCT")) || 0;
      const batteryCharge = parseFloat(extractValue("BCHARGE")) || 0;
      const timeLeft = parseFloat(extractValue("TIMELEFT")) || 0;
      const status = extractValue("STATUS") || "Unknown";

      return {
        _status: status.includes("ONLINE") ? "ok" : "warn",
        _statusText: status.includes("ONLINE") ? undefined : `UPS Status: ${status}`,
        loadPercent,
        batteryCharge,
        timeLeft,
        status,
      };
    }
  },
  toPayload: apcupsToPayload,
};
