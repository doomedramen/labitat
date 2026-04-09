import type { ServiceDefinition } from "./types"
import { WidgetContainer } from "@/components/widgets"
import { Zap, Battery, Clock, Thermometer } from "lucide-react"

type APCUPSData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  loadPercent: number
  batteryCharge: number
  timeLeft: number
  temperature: number
  status: string
}

function apcupsToPayload(data: APCUPSData) {
  const time = data.timeLeft ?? 0
  const timeLeftMin = time > 60 ? `${(time / 60).toFixed(0)}m` : `${time}s`

  return {
    stats: [
      {
        id: "load",
        value: `${data.loadPercent ?? 0}%`,
        label: "Load",
        icon: Zap,
      },
      {
        id: "battery",
        value: `${data.batteryCharge ?? 0}%`,
        label: "Battery",
        icon: Battery,
      },
      {
        id: "time",
        value: timeLeftMin,
        label: "Time",
        icon: Clock,
      },
      {
        id: "temp",
        value: `${data.temperature ?? 0}°C`,
        label: "Temp",
        icon: Thermometer,
      },
    ],
  }
}

export const apcupsDefinition: ServiceDefinition<APCUPSData> = {
  id: "apcups",
  name: "APC UPS",
  icon: "apc",
  category: "monitoring",
  defaultPollingMs: 15_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "http://192.168.1.100",
      helperText:
        "HTTP URL of your apcupsd web CGI server. This is an http(s) address — not the apcupsd TCP daemon port (3551).",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const res = await fetch(`${baseUrl}/multimon.cgi`)

    if (!res.ok) throw new Error(`APC UPS error: ${res.status}`)

    const html = await res.text()

    const extractValue = (label: string): string => {
      const regex = new RegExp(`${label}[^<]*<[^>]*>([^<]+)</`, "i")
      const match = html.match(regex)
      return match?.[1]?.trim() ?? ""
    }

    const loadPercent = parseFloat(extractValue("LOADPCT")) || 0
    const batteryCharge = parseFloat(extractValue("BCHARGE")) || 0
    const timeLeft = parseFloat(extractValue("TIMELEFT")) || 0
    const temperature = parseFloat(extractValue("ITEMP")) || 0
    const status = extractValue("STATUS") || "Unknown"

    return {
      _status: status.includes("ONLINE") ? "ok" : "warn",
      _statusText: status.includes("ONLINE")
        ? undefined
        : `UPS Status: ${status}`,
      loadPercent,
      batteryCharge,
      timeLeft,
      temperature,
      status,
    }
  },
  toPayload: apcupsToPayload,
}
