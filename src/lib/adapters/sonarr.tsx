import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

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
    <StatGrid
      items={[
        { value: queued, label: "Queued" },
        { value: missing, label: "Missing" },
        { value: wanted, label: "Wanted" },
        { value: series, label: "Series" },
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
