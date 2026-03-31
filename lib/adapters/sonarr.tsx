import type { ServiceDefinition } from "./types"

type SonarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  wanted: number
  queued: number
  series: number
  episodes: number
}

function SonarrWidget({ wanted, queued, series, episodes }: SonarrData) {
  const items = [
    { value: wanted, label: "Wanted" },
    { value: queued, label: "Queued" },
    { value: series, label: "Series" },
    { value: episodes, label: "Episodes" },
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
      placeholder: "https://sonarr.home.lab",
      helperText: "The base URL of your Sonarr instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Sonarr API key",
      helperText: "Found in Settings → General → Security",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = { "X-Api-Key": config.apiKey }

    const [seriesRes, queueRes] = await Promise.all([
      fetch(`${baseUrl}/api/v3/series`, { headers }),
      fetch(`${baseUrl}/api/v3/queue/status`, { headers }),
    ])

    if (!seriesRes.ok) {
      if (seriesRes.status === 401) throw new Error("Invalid API key")
      if (seriesRes.status === 404)
        throw new Error("Sonarr not found at this URL")
      throw new Error(`Sonarr error: ${seriesRes.status}`)
    }

    const seriesData = await seriesRes.json()
    const queueData = queueRes.ok ? await queueRes.json() : { totalCount: 0 }

    // Calculate stats
    let wanted = 0
    let episodes = 0

    for (const show of seriesData) {
      if (show.monitored && show.statistics) {
        const missing =
          show.statistics.episodeCount - show.statistics.episodeFileCount
        if (missing > 0) wanted += missing
        episodes += show.statistics.episodeCount ?? 0
      }
    }

    return {
      _status: "ok" as const,
      wanted,
      queued: queueData.totalCount ?? 0,
      series: seriesData.length,
      episodes,
    }
  },

  Widget: SonarrWidget,
}
