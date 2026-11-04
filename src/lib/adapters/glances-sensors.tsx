import type { ServiceDefinition } from "./types";
import { WidgetStatGrid } from "@/components/dashboard/item/widget-stat-grid";
import { ResourceBar } from "@/components/widgets";
import { Thermometer, Fan } from "lucide-react";
import type { WidgetPayload } from "./widget-types";

type GlancesSensorsData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  cpuTemp: number | null;
  maxTemp: number | null;
  fanSpeed: number | null;
};
import { fetchWithTimeout } from "./fetch-with-timeout";

function glancesSensorsToPayload(data: GlancesSensorsData): WidgetPayload {
  const cpu = data.cpuTemp ?? 0;
  const max = data.maxTemp ?? 0;
  const fan = data.fanSpeed ?? 0;
  const tempPct = Math.min(100, Math.round(cpu));

  return {
    stats: [
      {
        id: "cpu-temp",
        value: `${cpu}°C`,
        label: "CPU Temp",
        icon: Thermometer,
      },
      {
        id: "max-temp",
        value: data.maxTemp == null ? "—" : `${max}°C`,
        label: "Max Temp",
        icon: Thermometer,
      },
      {
        id: "fan-speed",
        value: data.fanSpeed == null ? "—" : `${fan} RPM`,
        label: "Fan Speed",
        icon: Fan,
      },
    ],
    customComponent: (
      <div className="mt-2">
        <ResourceBar
          label="CPU Temp"
          value={tempPct}
          hint={data.cpuTemp == null ? "Unavailable" : `${cpu}°C`}
          warningAt={60}
          criticalAt={80}
        />
      </div>
    ),
  };
}

function GlancesSensorsWidget({ cpuTemp, maxTemp, fanSpeed }: GlancesSensorsData) {
  const cpu = cpuTemp ?? 0;
  const max = maxTemp ?? 0;
  const fan = fanSpeed ?? 0;

  // Scale temperature as % of 100°C for the progress bar
  const tempPct = Math.min(100, Math.round(cpu));

  return (
    <div className="flex flex-col gap-2 text-xs">
      <ResourceBar
        label="CPU Temp"
        value={tempPct}
        hint={cpuTemp == null ? "Unavailable" : `${cpu}°C`}
        warningAt={60}
        criticalAt={80}
      />
      <WidgetStatGrid
        items={[
          {
            id: "max",
            value: maxTemp == null ? "—" : `${max}°C`,
            label: "Max",
            icon: Thermometer,
          },
          {
            id: "fan",
            value: fanSpeed == null ? "—" : `${fan} RPM`,
            label: "Fan",
            icon: Fan,
          },
        ]}
      />
    </div>
  );
}

export const glancesSensorsDefinition: ServiceDefinition<GlancesSensorsData> = {
  id: "glances-sensors",
  name: "Glances Sensors",
  icon: "glances",
  category: "monitoring",
  defaultPollingMs: 10_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://glances.example.org",
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: false,
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: false,
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url?.replace(/\/$/, "");
    if (!baseUrl) {
      throw new Error("Glances URL is required");
    }

    const headers: Record<string, string> = {};

    if (config.username && config.password) {
      headers["Authorization"] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
    }

    const res = await fetchWithTimeout(`${baseUrl}/api/4/sensors`, { headers });
    if (!res.ok) throw new Error(`Glances error: ${res.status}`);

    const sensors = await res.json();
    const sensorList = Array.isArray(sensors) ? sensors : [];

    // Find temperature sensors
    const tempSensors = sensorList.filter(
      (s: { type: string; label: string }) =>
        s.type === "temperature_core" ||
        s.type === "temperature" ||
        s.label?.toLowerCase().includes("cpu") ||
        s.label?.toLowerCase().includes("core"),
    );

    const fanSensors = sensorList.filter((s: { type: string }) => s.type === "fan_speed");

    const temps = tempSensors
      .map((s: { value: number }) => s.value)
      .filter(
        (value: unknown): value is number => typeof value === "number" && Number.isFinite(value),
      );
    const cpuTemp = temps.length > 0 ? temps[0] : null;
    const maxTemp = temps.length > 0 ? Math.max(...temps) : null;

    const fans = fanSensors
      .map((s: { value: number }) => s.value)
      .filter(
        (value: unknown): value is number => typeof value === "number" && Number.isFinite(value),
      );
    const fanSpeed = fans.length > 0 ? fans[0] : null;

    return {
      _status: "ok",
      cpuTemp,
      maxTemp,
      fanSpeed,
    };
  },
  toPayload: glancesSensorsToPayload,
  renderWidget: GlancesSensorsWidget,
};
