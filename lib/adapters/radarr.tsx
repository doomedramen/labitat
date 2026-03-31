import type { ServiceDefinition } from "./types"

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
    { value: wanted, label: "Wanted" },
    { value: missing, label: "Missing" },
    { value: queued, label: "Queued" },
    { value: movies, label: "Movies" },
  ]

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-1.5 text-xs">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1 text-center"
        >
          <span className="font-medium text-foreground tabular-nums">
            {item.value}
          </span>
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
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
      placeholder: "https://radarr.home.lab",
      helperText: "The base URL of your Radarr instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Radarr API key",
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

    // Calculate stats from movies
    let wanted = 0
    let missing = 0

    for (const movie of moviesData) {
      if (movie.monitored && !movie.hasFile) {
        wanted++
        // "missing" is the same as wanted in Radarr context
        // but could also check movie.status === 'released' && !movie.hasFile
        if (movie.status === "released") {
          missing++
        }
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
