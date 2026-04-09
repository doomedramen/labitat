import type { ServiceDefinition } from "./types"
import { StatGrid, ResourceBar } from "@/components/widgets"

type GlancesSensorsData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  cpuTemp: number
  maxTemp: number
  fanSpeed: number
}

function GlancesSensorsWidget({
  cpuTemp,
  maxTemp,
  fanSpeed,
}: GlancesSensorsData) {
  const cpu = cpuTemp ?? 0
  const max = maxTemp ?? 0
  const fan = fanSpeed ?? 0

  // Scale temperature as % of 100°C for the progress bar
  const tempPct = Math.min(100, Math.round(cpu))

  return (
    <div className="flex flex-col gap-2 text-xs">
      <ResourceBar
        label="CPU Temp"
        value={tempPct}
        hint={`${cpu}°C`}
        warningAt={60}
        criticalAt={80}
      />
      <StatGrid
        items={[
          { value: `${max}°C`, label: "Max" },
          { value: fan > 0 ? `${fan} RPM` : "N/A", label: "Fan" },
        ]}
      />
    </div>
  )
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
    const baseUrl = config.url.replace(/\/$/, "")
    const headers: Record<string, string> = {}

    if (config.username && config.password) {
      headers["Authorization"] =
        `Basic ${btoa(`${config.username}:${config.password}`)}`
    }

    const res = await fetch(`${baseUrl}/api/4/sensors`, { headers })
    if (!res.ok) throw new Error(`Glances error: ${res.status}`)

    const sensors = await res.json()
    const sensorList = Array.isArray(sensors) ? sensors : []

    // Find temperature sensors
    const tempSensors = sensorList.filter(
      (s: { type: string; label: string }) =>
        s.type === "temperature_core" ||
        s.type === "temperature" ||
        s.label?.toLowerCase().includes("cpu") ||
        s.label?.toLowerCase().includes("core")
    )

    const fanSensors = sensorList.filter(
      (s: { type: string }) => s.type === "fan_speed"
    )

    const temps = tempSensors.map((s: { value: number }) => s.value ?? 0)
    const cpuTemp = temps.length > 0 ? Math.round(temps[0]) : 0
    const maxTemp = temps.length > 0 ? Math.round(Math.max(...temps)) : 0

    const fans = fanSensors.map((s: { value: number }) => s.value ?? 0)
    const fanSpeed = fans.length > 0 ? Math.round(fans[0]) : 0

    return {
      _status: "ok",
      cpuTemp,
      maxTemp,
      fanSpeed,
    }
  },
  Widget: GlancesSensorsWidget,
}
