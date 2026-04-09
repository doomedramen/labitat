import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

type RadarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  queued: number
  missing: number
  wanted: number
  movies: number
}

function RadarrWidget({ queued, missing, wanted, movies }: RadarrData) {
  return (
    <StatGrid
      items={[
        { value: queued, label: "Queued" },
        { value: missing, label: "Missing" },
        { value: wanted, label: "Wanted" },
        { value: movies, label: "Movies" },
      ]}
    />
  )
}

export const radarrDefinition: ServiceDefinition<RadarrData> = {
  id: "radarr",
  name: "Radarr",
  icon: "radarr",
  category: "downloads",
  defaultPollingMs: 10_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://radarr.example.org",
      helperText: "The base URL of your Radarr instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Radarr API key",
      helperText: "Found in Radarr → Settings → General → API Key",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = { "X-Api-Key": config.apiKey }

    const [queueRes, movieRes, missingRes, cutoffRes] = await Promise.all([
      fetch(`${baseUrl}/api/v3/queue?pageSize=1`, { headers }),
      fetch(`${baseUrl}/api/v3/movie`, { headers }),
      fetch(`${baseUrl}/api/v3/wanted/missing?pageSize=1`, { headers }),
      fetch(`${baseUrl}/api/v3/wanted/cutoff?pageSize=1`, { headers }),
    ])

    if (!queueRes.ok) throw new Error(`Radarr error: ${queueRes.status}`)
    if (!movieRes.ok) throw new Error(`Radarr error: ${movieRes.status}`)
    if (!missingRes.ok) throw new Error(`Radarr error: ${missingRes.status}`)

    const queue = await queueRes.json()
    const movies = await movieRes.json()
    const missing = await missingRes.json()
    const cutoff = cutoffRes.ok ? await cutoffRes.json() : { totalRecords: 0 }

    return {
      _status: "ok",
      queued: queue.totalRecords ?? 0,
      missing: missing.totalRecords ?? 0,
      wanted: cutoff.totalRecords ?? 0,
      movies: Array.isArray(movies) ? movies.length : 0,
    }
  },
  Widget: RadarrWidget,
}
