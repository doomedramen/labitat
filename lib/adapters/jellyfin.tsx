import type { ServiceDefinition } from "./types"
import { StatGrid } from "./widgets"

type JellyfinData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  activeStreams: number
  movies: number
  shows: number
  episodes: number
}

function JellyfinWidget({
  activeStreams,
  movies,
  shows,
  episodes,
}: JellyfinData) {
  const items = [
    { value: activeStreams, label: "Active Streams" },
    { value: movies, label: "Movies" },
    { value: shows, label: "Shows" },
    { value: episodes, label: "Episodes" },
  ]

  return <StatGrid items={items} />
}

export const jellyfinDefinition: ServiceDefinition<JellyfinData> = {
  id: "jellyfin",
  name: "Jellyfin",
  icon: "jellyfin",
  category: "media",
  defaultPollingMs: 10_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://jellyfin.example.org",
      helperText: "The base URL of your Jellyfin instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Jellyfin password or API key",
      helperText: "Found in Dashboard → Advanced → API Keys",
    },
    {
      key: "version",
      label: "API Version",
      type: "select",
      options: [
        { value: "1", label: "v1" },
        { value: "2", label: "v2" },
      ],
      helperText: "Jellyfin API version (v2 for Jellyfin 10.9+)",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const version = config.version ?? "1"
    const useJellyfinV2 = version === "2"

    // Jellyfin uses MediaBrowser auth header format
    const deviceId = encodeURIComponent(
      `labitat-${config.url.replace(/^https?:\/\//, "")}`
    )
    const authHeader = `MediaBrowser Token="${encodeURIComponent(config.apiKey)}", Client="Labitat", Device="Labitat", DeviceId="${deviceId}", Version="1.0.0"`
    const headers = { Authorization: authHeader }

    const sessionsEndpoint = useJellyfinV2 ? "/Sessions" : "/Sessions"
    const itemsEndpoint = useJellyfinV2 ? "/Items/Counts" : "/Items/Counts"

    const [sessionsRes, countsRes] = await Promise.all([
      fetch(`${baseUrl}${sessionsEndpoint}?ActiveWithinSeconds=120`, {
        headers,
      }),
      fetch(`${baseUrl}${itemsEndpoint}`, { headers }),
    ])

    if (!sessionsRes.ok) {
      if (sessionsRes.status === 401) throw new Error("Invalid API key")
      if (sessionsRes.status === 404)
        throw new Error("Jellyfin not found at this URL")
      throw new Error(`Jellyfin error: ${sessionsRes.status}`)
    }

    const sessionsData = await sessionsRes.json()
    const countsData = (await countsRes.ok)
      ? await countsRes.json()
      : { MovieCount: 0, SeriesCount: 0, EpisodeCount: 0, SongCount: 0 }

    // Count active streams (sessions with NowPlayingItem)
    const activeStreams = sessionsData.filter(
      (s: { NowPlayingItem?: unknown; PlayState?: { IsPaused: boolean } }) =>
        s.NowPlayingItem && !s.PlayState?.IsPaused
    ).length

    return {
      _status: "ok" as const,
      activeStreams,
      movies: countsData.MovieCount ?? 0,
      shows: countsData.SeriesCount ?? 0,
      episodes: countsData.EpisodeCount ?? 0,
    }
  },

  Widget: JellyfinWidget,
}
