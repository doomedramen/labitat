import type { ServiceDefinition } from "./types"
import type { ActiveStream } from "@/components/widgets"
import { Play, Film, Tv, Layers, Music } from "lucide-react"
import { buildStreamsTooltip } from "@/lib/utils/format-media"

type EmbyData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  activeStreams: number
  movies: number
  shows: number
  episodes: number
  songs: number
  showActiveStreams?: boolean
  sessions?: ActiveStream[]
}

/**
 * Format media title with consistent SxxEyy formatting for TV episodes.
 * Shared across Plex, Jellyfin, Emby, and Tautulli adapters for UI consistency.
 */
function formatMediaTitle(
  title: string,
  options: {
    type?: string
    seriesName?: string
    season?: number | null
    episode?: number | null
    albumArtist?: string
    album?: string
  } = {}
): { title: string; subtitle?: string } {
  const { type, seriesName, season, episode, albumArtist, album } = options

  // TV Episode: S01E05 - Episode Name
  if (type === "episode" && seriesName) {
    let formattedTitle = title
    if (season != null && episode != null) {
      formattedTitle = `S${String(season).padStart(2, "0")}E${String(episode).padStart(2, "0")} - ${title}`
    }
    return { title: formattedTitle, subtitle: seriesName }
  }

  // Audio: Album - Song Name (subtitle = Artist)
  if (type === "track" && albumArtist) {
    const formattedTitle = album ? `${album} - ${title}` : title
    return { title: formattedTitle, subtitle: albumArtist }
  }

  // Movie or other: just the title
  return { title, subtitle: undefined }
}

function embyToPayload(data: EmbyData) {
  return {
    stats: [
      {
        id: "active",
        value: (data.activeStreams ?? 0).toLocaleString(),
        label: "Active Streams",
        icon: Play,
        tooltip: buildStreamsTooltip(data.sessions ?? []),
      },
      {
        id: "movies",
        value: (data.movies ?? 0).toLocaleString(),
        label: "Movies",
        icon: Film,
      },
      {
        id: "shows",
        value: (data.shows ?? 0).toLocaleString(),
        label: "Shows",
        icon: Tv,
      },
      {
        id: "episodes",
        value: (data.episodes ?? 0).toLocaleString(),
        label: "Episodes",
        icon: Layers,
      },
      {
        id: "songs",
        value: (data.songs ?? 0).toLocaleString(),
        label: "Songs",
        icon: Music,
      },
    ],
    streams:
      data.showActiveStreams && data.sessions?.length
        ? data.sessions.map((session) => ({
            title: session.title,
            subtitle: session.subtitle,
            user: session.user,
            progress: session.progress,
            duration: session.duration,
            state: session.state,
            streamId: session.streamId,
            transcoding: session.transcoding,
          }))
        : undefined,
    // Default to 4 stats: hide Active Streams
    defaultActiveIds: ["movies", "shows", "episodes", "songs"],
  }
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
      placeholder: "https://emby.example.org",
      helperText: "The base URL of your Emby instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Emby password or API key",
      helperText: "Found in Dashboard → Advanced → API Keys",
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
    const showActiveStreams = config.showActiveStreams === "true"
    const headers = { "X-Emby-Token": config.apiKey }

    const [sessionsRes, countsRes] = await Promise.all([
      fetch(`${baseUrl}/Sessions?ActiveWithinSeconds=120`, { headers }),
      fetch(`${baseUrl}/Items/Counts`, { headers }),
    ])

    if (!sessionsRes.ok) {
      if (sessionsRes.status === 401) throw new Error("Invalid API key")
      if (sessionsRes.status === 404)
        throw new Error("Emby not found at this URL")
      throw new Error(`Emby error: ${sessionsRes.status}`)
    }

    const sessionsData = await sessionsRes.json()
    const countsData = await countsRes.json()

    // Count active streams and build session list
    const sessions: ActiveStream[] = []
    let activeStreams = 0

    if (Array.isArray(sessionsData)) {
      for (const session of sessionsData) {
        if (!session.NowPlayingItem) continue

        const isPaused = session.PlayState?.IsPaused ?? false
        if (!isPaused) activeStreams++

        if (showActiveStreams) {
          const nowPlaying = session.NowPlayingItem
          const playState = session.PlayState || {}

          // Use shared formatMediaTitle for consistent formatting across all media adapters
          const { title: formattedTitle, subtitle } = formatMediaTitle(
            nowPlaying.Name ?? "Unknown",
            {
              type: nowPlaying.Type?.toLowerCase(),
              seriesName: nowPlaying.SeriesName,
              season: nowPlaying.ParentIndexNumber,
              episode: nowPlaying.IndexNumber,
              albumArtist: nowPlaying.AlbumArtist,
              album: nowPlaying.Album,
            }
          )

          // Get user name
          const user = session.UserName ?? "Unknown"

          // Calculate progress (ticks to seconds)
          const positionTicks = playState.PositionTicks ?? 0
          const runTimeTicks = nowPlaying.RunTimeTicks ?? 0
          const duration = runTimeTicks > 0 ? runTimeTicks / 10000000 : 0
          const progressSeconds = positionTicks / 10000000

          // Get transcoding info
          const transcodingInfo = session.TranscodingInfo
            ? {
                isDirect: session.TranscodingInfo.IsVideoDirect ?? false,
                hardwareDecoding:
                  session.TranscodingInfo.HardwareDecoding ?? false,
                hardwareEncoding:
                  session.TranscodingInfo.HardwareEncoding ?? false,
              }
            : undefined

          sessions.push({
            title: formattedTitle,
            subtitle,
            user,
            progress: progressSeconds,
            duration,
            state: isPaused ? "paused" : "playing",
            streamId: session.Id,
            transcoding: transcodingInfo,
          })
        }
      }
    }

    return {
      _status: "ok" as const,
      activeStreams,
      movies: countsData.MovieCount ?? 0,
      shows: countsData.SeriesCount ?? 0,
      episodes: countsData.EpisodeCount ?? 0,
      songs: countsData.SongCount ?? 0,
      showActiveStreams,
      sessions,
    }
  },

  toPayload: embyToPayload,
}
