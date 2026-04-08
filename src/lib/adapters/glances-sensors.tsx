import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

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
  const tempColor =
    cpuTemp > 80
      ? "text-destructive"
      : cpuTemp > 60
        ? "text-amber-500"
        : undefined

  return (
    <StatGrid
      items={[
        { value: `${cpuTemp}°C`, label: "CPU Temp", valueClassName: tempColor },
        { value: `${maxTemp}°C`, label: "Max Temp" },
        { value: fanSpeed > 0 ? `${fanSpeed} RPM` : "N/A", label: "Fan" },
      ]}
    />
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
