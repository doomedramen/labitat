import type { ServiceDefinition } from "./types"

type EmbyData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  activeStreams: number
  movies: number
  shows: number
  episodes: number
}

function EmbyWidget({ activeStreams, movies, shows, episodes }: EmbyData) {
  const items = [
    { value: activeStreams, label: "Active Streams" },
    { value: movies, label: "Movies" },
    { value: shows, label: "Shows" },
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

export const embyDefinition: ServiceDefinition<EmbyData> = {
  id: "emby",
  name: "Emby",
  icon: "emby",
  category: "media",
  defaultPollingMs: 10_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://emby.home.lab",
      helperText: "The base URL of your Emby instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Emby API key",
      helperText: "Found in Dashboard → Advanced → API Keys",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = { "X-Emby-Token": config.apiKey }

    const [sessionsRes, moviesRes, showsRes] = await Promise.all([
      fetch(`${baseUrl}/Sessions?ActiveWithinSeconds=120`, { headers }),
      fetch(`${baseUrl}/Items?IncludeItemTypes=Movie&Recursive=true&Limit=0`, {
        headers,
      }),
      fetch(`${baseUrl}/Items?IncludeItemTypes=Series&Recursive=true&Limit=0`, {
        headers,
      }),
    ])

    if (!sessionsRes.ok) {
      if (sessionsRes.status === 401) throw new Error("Invalid API key")
      if (sessionsRes.status === 404)
        throw new Error("Emby not found at this URL")
      throw new Error(`Emby error: ${sessionsRes.status}`)
    }

    const sessionsData = await sessionsRes.json()
    const moviesData = (await moviesRes.ok)
      ? await moviesRes.json()
      : { TotalRecordCount: 0 }
    const showsData = (await showsRes.ok)
      ? await showsRes.json()
      : { TotalRecordCount: 0 }

    // Count active streams (sessions with NowPlayingItem that's not paused)
    const activeStreams = sessionsData.filter(
      (s: { NowPlayingItem?: unknown; PlayState?: { IsPaused: boolean } }) =>
        s.NowPlayingItem && !s.PlayState?.IsPaused
    ).length

    return {
      _status: "ok" as const,
      activeStreams,
      movies: moviesData.TotalRecordCount ?? 0,
      shows: showsData.TotalRecordCount ?? 0,
      episodes: 0, // Would require separate call
    }
  },

  Widget: EmbyWidget,
}
