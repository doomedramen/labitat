import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

type APCUPSData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  loadPercent: number
  batteryCharge: number
  timeLeft: number
  temperature: number
  status: string
}

function APCUPSWidget({
  loadPercent,
  batteryCharge,
  timeLeft,
  temperature,
  status,
}: APCUPSData) {
  const timeLeftMin =
    timeLeft > 60 ? `${(timeLeft / 60).toFixed(0)}m` : `${timeLeft ?? 0}s`

  return (
    <StatGrid
      items={[
        { value: `${loadPercent}%`, label: "Load" },
        { value: `${batteryCharge}%`, label: "Battery" },
        { value: timeLeftMin, label: "Time Left" },
        { value: `${temperature}°C`, label: "Temp" },
        { value: status, label: "Status" },
      ]}
    />
  )
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
      placeholder: "https://apcupsd.example.org",
      helperText: "URL to your apcupsd CGI status page",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const res = await fetch(`${baseUrl}/multimon.cgi`)

    if (!res.ok) throw new Error(`APC UPS error: ${res.status}`)

    const html = await res.text()

    // Parse values from HTML
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
  Widget: APCUPSWidget,
}
