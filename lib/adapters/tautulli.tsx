import type { ServiceDefinition } from "./types"
import { ActiveStreamList } from "./widgets"

type TautulliSession = {
  title: string
  parent_title?: string
  grandparent_title?: string
  full_title: string
  user: string
  progress: number
  episode_number?: number
  season_number?: number
  state?: "playing" | "paused"
}

type TautulliData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  streams: number
  bandwidth: string
  transcodes: number
  library: number
  showActiveStreams?: boolean
  sessions?: TautulliSession[]
}

function formatBandwidth(kbps: number): string {
  if (kbps >= 1_000_000) {
    return `${(kbps / 1_000_000).toFixed(1)} Gbps`
  }
  if (kbps >= 1_000) {
    return `${(kbps / 1_000).toFixed(1)} Mbps`
  }
  return `${kbps.toFixed(0)} Kbps`
}

function TautulliWidget({
  streams,
  bandwidth,
  transcodes,
  library,
  showActiveStreams,
  sessions,
}: TautulliData) {
  const statsItems = [
    { value: streams, label: "Streams" },
    { value: bandwidth, label: "Bandwidth" },
    { value: transcodes, label: "Transcodes" },
    { value: library, label: "Library" },
  ]

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-1.5 text-xs">
        {statsItems.map((item) => (
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

      {showActiveStreams && sessions && sessions.length > 0 && (
        <ActiveStreamList
          streams={sessions.map((session) => ({
            title: session.full_title,
            user: session.user,
            progress: session.progress,
            state: session.state,
          }))}
        />
      )}
    </div>
  )
}

export const tautulliDefinition: ServiceDefinition<TautulliData> = {
  id: "tautulli",
  name: "Tautulli",
  icon: "tautulli",
  category: "media",
  defaultPollingMs: 5_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://tautulli.home.lab",
      helperText: "The base URL of your Tautulli instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Tautulli API key",
      helperText: "Found in Settings → Web Interface → API",
    },
    {
      key: "showActiveStreams",
      label: "Show active streams",
      type: "boolean",
      helperText: "Display currently playing media",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const params = new URLSearchParams({ apikey: config.apiKey })
    const showActiveStreams = config.showActiveStreams === "true"

    // Get activity and library stats
    const [activityRes, libraryRes] = await Promise.all([
      fetch(`${baseUrl}/api/v2?cmd=get_activity&${params}`),
      fetch(`${baseUrl}/api/v2?cmd=get_libraries&${params}`),
    ])

    if (!activityRes.ok) {
      if (activityRes.status === 401) throw new Error("Invalid API key")
      if (activityRes.status === 404)
        throw new Error("Tautulli not found at this URL")
      throw new Error(`Tautulli error: ${activityRes.status}`)
    }

    const activityData = await activityRes.json()
    const libraryData = libraryRes.ok
      ? await libraryRes.json()
      : { response: { data: [] } }

    if (activityData.response?.result !== "success") {
      throw new Error(activityData.response?.message ?? "Tautulli API error")
    }

    const activity = activityData.response.data ?? {}
    const libraries = libraryData.response?.data ?? []

    // Count total library items
    let libraryCount = 0
    for (const lib of libraries) {
      // Use num_artists for music, num_movies for movies, num_episodes/num_seasons for shows
      libraryCount +=
        lib.num_artists ?? lib.num_movies ?? lib.num_episodes ?? lib.count ?? 0
    }

    // Get active sessions if enabled
    let sessions: TautulliSession[] = []
    if (showActiveStreams) {
      const sessionsRes = await fetch(
        `${baseUrl}/api/v2?cmd=get_activity&${params}`
      )
      if (sessionsRes.ok) {
        const sessionsData = await sessionsRes.json()
        const sessionsList = sessionsData.response?.data?.sessions ?? []
        sessions = sessionsList.map((s: Record<string, unknown>) => ({
          title: (s.title as string) ?? "",
          parent_title: (s.parent_title as string) ?? "",
          grandparent_title: (s.grandparent_title as string) ?? "",
          full_title: (s.full_title as string) ?? "",
          user: (s.friendly_name as string) ?? (s.user as string) ?? "",
          // view_offset is in milliseconds, convert to seconds
          progress: ((s.view_offset as number) ?? 0) / 1000,
          episode_number: s.episode_number as number | undefined,
          season_number: s.season_number as number | undefined,
          state: (s.state as string) === "paused" ? "paused" : "playing",
        }))
      }
    }

    return {
      _status: "ok" as const,
      streams: activity.stream_count ?? 0,
      bandwidth: formatBandwidth(activity.total_bandwidth ?? 0),
      transcodes: activity.stream_count_transcode ?? 0,
      library: libraryCount,
      showActiveStreams,
      sessions,
    }
  },

  Widget: TautulliWidget,
}
