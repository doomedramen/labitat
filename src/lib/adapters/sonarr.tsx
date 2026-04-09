import type { ServiceDefinition } from "./types"
import { WidgetStatGrid } from "@/components/dashboard/item/widget-stat-grid"
import { Tv, Download, AlertTriangle, Search } from "lucide-react"

type SonarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  queued: number
  missing: number
  wanted: number
  series: number
}

function SonarrWidget({ queued, missing, wanted, series }: SonarrData) {
  return (
    <WidgetStatGrid
      items={[
        {
          id: "queued",
          value: queued,
          label: "Queued",
          icon: <Download className="h-3 w-3" />,
        },
        {
          id: "missing",
          value: missing,
          label: "Missing",
          icon: <AlertTriangle className="h-3 w-3" />,
        },
        {
          id: "wanted",
          value: wanted,
          label: "Wanted",
          icon: <Search className="h-3 w-3" />,
        },
        {
          id: "series",
          value: series,
          label: "Series",
          icon: <Tv className="h-3 w-3" />,
        },
      ]}
    />
  )
}

export const sonarrDefinition: ServiceDefinition<SonarrData> = {
  id: "sonarr",
  name: "Sonarr",
  icon: "sonarr",
  category: "downloads",
  defaultPollingMs: 10_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://sonarr.example.org",
      helperText: "The base URL of your Sonarr instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Sonarr API key",
      helperText: "Found in Sonarr → Settings → General → API Key",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = { "X-Api-Key": config.apiKey }

    const [queueRes, seriesRes, missingRes, cutoffRes] = await Promise.all([
      fetch(`${baseUrl}/api/v3/queue?pageSize=1`, { headers }),
      fetch(`${baseUrl}/api/v3/series`, { headers }),
      fetch(`${baseUrl}/api/v3/wanted/missing?pageSize=1`, { headers }),
      fetch(`${baseUrl}/api/v3/wanted/cutoff?pageSize=1`, { headers }),
    ])

    if (!queueRes.ok) throw new Error(`Sonarr error: ${queueRes.status}`)
    if (!seriesRes.ok) throw new Error(`Sonarr error: ${seriesRes.status}`)
    if (!missingRes.ok) throw new Error(`Sonarr error: ${missingRes.status}`)

    const queue = await queueRes.json()
    const series = await seriesRes.json()
    const missing = await missingRes.json()
    const cutoff = cutoffRes.ok ? await cutoffRes.json() : { totalRecords: 0 }

    return {
      _status: "ok",
      queued: queue.totalRecords ?? 0,
      missing: missing.totalRecords ?? 0,
      wanted: cutoff.totalRecords ?? 0,
      series: Array.isArray(series) ? series.length : 0,
    }
  },
  Widget: SonarrWidget,
}
