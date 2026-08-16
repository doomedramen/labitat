import type { ServiceDefinition } from "./types";
import { Zap, Battery, Clock } from "lucide-react";

type NutData = {
  _status?: "ok" | "warn" | "none";
  _statusText?: string;
  status: string;
  batteryCharge: number;
  runtimeSeconds: number;
  loadPercent: number;
};

// NUT `ups.status` is a space-separated set of status codes (e.g. "OL" or "OB LB").
const WARN_STATUS_CODES = new Set(["OB", "LB", "RB", "DISCHRG", "BYPASS", "OVER"]);

const STATUS_LABELS: Record<string, string> = {
  OL: "Online",
  OB: "On Battery",
  LB: "Low Battery",
  RB: "Replace Battery",
  CHRG: "Charging",
  DISCHRG: "Discharging",
  BYPASS: "Bypass",
  CAL: "Calibrating",
  OFF: "Off",
  OVER: "Overload",
  TRIM: "Trimming",
  BOOST: "Boosting",
  FSD: "Forced Shutdown",
};

function formatNutStatus(status: string): string {
  const codes = (status ?? "").split(/\s+/).filter(Boolean);
  if (codes.length === 0) return "Unknown";
  return codes.map((code) => STATUS_LABELS[code] ?? code).join(", ");
}

function mapNutStatus(status: string): "ok" | "warn" | "none" {
  const codes = (status ?? "").split(/\s+/).filter(Boolean);
  if (codes.length === 0) return "none";
  if (codes.some((code) => WARN_STATUS_CODES.has(code))) return "warn";
  if (codes.includes("OL")) return "ok";
  return "none";
}

// NUT reports battery.runtime in seconds (unlike APC's TIMELEFT, which is in minutes).
function formatRuntime(seconds: number): string {
  if (seconds <= 0) return "0m";
  const minutes = seconds / 60;
  if (minutes < 1) return `${Math.round(seconds)}s`;
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

function nutToPayload(data: NutData) {
  const runtime = formatRuntime(data.runtimeSeconds ?? 0);

  return {
    stats: [
      {
        id: "status",
        value: formatNutStatus(data.status),
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
        id: "runtime",
        value: runtime,
        label: "Runtime",
        icon: Clock,
      },
    ],
  };
}

export const nutDefinition: ServiceDefinition<NutData> = {
  id: "nut",
  name: "NUT UPS",
  icon: "network-ups-tools",
  category: "monitoring",
  defaultPollingMs: 15_000,
  configFields: [
    {
      key: "host",
      label: "Host",
      type: "text",
      required: true,
      placeholder: "192.168.1.100",
      helperText: "IP address or hostname of your NUT (upsd) server",
    },
    {
      key: "port",
      label: "Port",
      type: "number",
      required: false,
      placeholder: "3493",
      helperText: "NUT upsd network port (default: 3493)",
    },
    {
      key: "upsName",
      label: "UPS Name",
      type: "text",
      required: true,
      placeholder: "ups",
      helperText: "Name of the UPS as configured on the NUT server (ups.conf section name)",
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: false,
      helperText: "Only required if your NUT server has upsd users configured",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: false,
      helperText: "Only required if your NUT server has upsd users configured",
    },
  ],
  async fetchData(config) {
    const host = config.host;
    const port = parseInt(config.port ?? "3493", 10);
    const upsName = config.upsName;

    if (!host) {
      throw new Error("Host is required for TCP connection");
    }

    if (!upsName) {
      throw new Error("UPS name is required");
    }

    try {
      // Import server-only TCP utility
      const { fetchNutTcpStatus } = await import("@/lib/nut-tcp");
      const { status, batteryCharge, runtimeSeconds, loadPercent } = await fetchNutTcpStatus(
        host,
        port,
        upsName,
        config.username || undefined,
        config.password || undefined,
      );

      const mapped = mapNutStatus(status);

      return {
        _status: mapped,
        _statusText: mapped === "warn" ? `UPS Status: ${status}` : undefined,
        status,
        batteryCharge,
        runtimeSeconds,
        loadPercent,
      };
    } catch (error) {
      throw new Error(
        `TCP connection to ${host}:${port} failed: ${error instanceof Error ? error.message : "Unknown error"}`,
      );
    }
  },
  toPayload: nutToPayload,
};
