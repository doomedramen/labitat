import type { ServiceDefinition } from "./types"
import { StatGrid } from "./widgets"

type RadarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  wanted: number
  missing: number
  queued: number
  movies: number
}

function RadarrWidget({ wanted, missing, queued, movies }: RadarrData) {
  const items = [
    { value: (wanted ?? 0).toLocaleString(), label: "Wanted" },
    { value: (missing ?? 0).toLocaleString(), label: "Missing" },
    { value: (queued ?? 0).toLocaleString(), label: "Queued" },
    { value: (movies ?? 0).toLocaleString(), label: "Movies" },
  ]

  return <StatGrid items={items} />
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
      placeholder: "Your Radarr password or API key",
      helperText: "Found in Settings → General → Security",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = { "X-Api-Key": config.apiKey }

    // Fetch movies and queue in parallel
    const [moviesRes, queueRes] = await Promise.all([
      fetch(`${baseUrl}/api/v3/movie`, { headers }),
      fetch(`${baseUrl}/api/v3/queue/status`, { headers }),
    ])

    if (!moviesRes.ok) {
      if (moviesRes.status === 401) throw new Error("Invalid API key")
      if (moviesRes.status === 404)
        throw new Error("Radarr not found at this URL")
      throw new Error(`Radarr error: ${moviesRes.status}`)
    }

    const moviesData = await moviesRes.json()
    const queueData = queueRes.ok ? await queueRes.json() : { totalCount: 0 }

    // Calculate stats from movies (matching Homepage logic)
    let wanted = 0
    let missing = 0

    for (const movie of moviesData) {
      // Wanted: monitored, no file, and available
      if (movie.monitored && !movie.hasFile && movie.isAvailable) {
        wanted++
      }
      // Missing: monitored and no file (regardless of availability)
      if (movie.monitored && !movie.hasFile) {
        missing++
      }
    }

    return {
      _status: "ok" as const,
      wanted,
      missing,
      queued: queueData.totalCount ?? 0,
      movies: moviesData.length,
    }
  },

  Widget: RadarrWidget,
}
