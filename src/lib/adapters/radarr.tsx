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

    const [queueRes, movieRes, wantedRes] = await Promise.all([
      fetch(`${baseUrl}/api/v3/queue?includeUnknownMovieItems=true`, {
        headers,
      }),
      fetch(`${baseUrl}/api/v3/movie`, { headers }),
      fetch(`${baseUrl}/api/v3/wanted/missing`, { headers }),
    ])

    if (!queueRes.ok) throw new Error(`Radarr error: ${queueRes.status}`)
    if (!movieRes.ok) throw new Error(`Radarr error: ${movieRes.status}`)
    if (!wantedRes.ok) throw new Error(`Radarr error: ${wantedRes.status}`)

    const queue = await queueRes.json()
    const movies = await movieRes.json()
    const wanted = await wantedRes.json()

    return {
      _status: "ok",
      queued: queue.totalCount ?? 0,
      missing: wanted.total ?? 0,
      wanted: wanted.total ?? 0,
      movies: movies.length ?? 0,
    }
  },
  Widget: RadarrWidget,
}
