import type { ServiceDefinition } from "./types"
import type { ActiveStream } from "@/components/widgets"
import { Play, Music, Film, Tv } from "lucide-react"
import { buildStreamsTooltip, formatMediaTitle } from "@/lib/utils/format-media"

type PlexSession = {
  title: string
  subtitle?: string
  user: string
  progress: number
  duration: number
  state?: "playing" | "paused"
  streamId?: string
  transcoding?: {
    isDirect?: boolean
    hardwareDecoding?: boolean
    hardwareEncoding?: boolean
  }
}

type PlexData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  streams: number
  albums: number
  movies: number
  tvShows: number
  showActiveStreams?: boolean
  sessions?: PlexSession[]
}

function decodeXMLEntities(str: string): string {
  return str
    .replace(/&amp;/g, "&")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .replace(/&quot;/g, '"')
    .replace(/&#?39;/g, "'")
    .replace(/&apos;/g, "'")
}

function plexToPayload(data: PlexData) {
  const sessions =
    data.sessions?.map((s) => ({
      title: s.title,
      subtitle: s.subtitle,
      user: s.user,
      progress: s.progress,
      duration: s.duration,
      state: s.state,
      streamId: s.streamId,
      transcoding: s.transcoding,
    })) ?? []

  return {
    stats: [
      {
        id: "active",
        value: data.streams,
        label: "Active",
        icon: Play,
        tooltip: buildStreamsTooltip(sessions),
      },
      {
        id: "albums",
        value: data.albums,
        label: "Albums",
        icon: Music,
      },
      {
        id: "movies",
        value: data.movies,
        label: "Movies",
        icon: Film,
      },
      {
        id: "shows",
        value: data.tvShows,
        label: "Shows",
        icon: Tv,
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
  }
}

export const plexDefinition: ServiceDefinition<PlexData> = {
  id: "plex",
  name: "Plex",
  icon: "plex",
  category: "media",
  defaultPollingMs: 10_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://plex.example.org",
      helperText: "The base URL of your Plex instance",
    },
    {
      key: "token",
      label: "Token",
      type: "password",
      required: true,
      placeholder: "Your Plex authentication token",
      helperText: "Found in Plex Web → Settings → General (view XML)",
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
    const headers = { "X-Plex-Token": config.token }
    const showActiveStreams = config.showActiveStreams === "true"

    const [sessionsRes, libraryRes] = await Promise.all([
      fetch(`${baseUrl}/status/sessions`, { headers }),
      fetch(`${baseUrl}/library/sections`, { headers }),
    ])

    if (!sessionsRes.ok) {
      if (sessionsRes.status === 401) throw new Error("Invalid Plex token")
      if (sessionsRes.status === 404)
        throw new Error("Plex not found at this URL")
      throw new Error(`Plex error: ${sessionsRes.status}`)
    }

    const sessionsText = await sessionsRes.text()
    const libraryText = await libraryRes.text()

    const streamMatch = sessionsText.match(/size="(\d+)"/)
    const streams = streamMatch ? parseInt(streamMatch[1], 10) : 0

    const dirRegex = /<Directory[^>]*key="([^"]*)"[^>]*type="([^"]*)"[^>]*>/g
    const libraries: { key: string; type: string }[] = []
    let dirMatch
    while ((dirMatch = dirRegex.exec(libraryText)) !== null) {
      const [, key, type] = dirMatch
      if (["movie", "show", "artist"].includes(type)) {
        libraries.push({ key, type })
      }
    }

    let albums = 0
    let movies = 0
    let tvShows = 0

    await Promise.all(
      libraries.map(async ({ key, type }) => {
        const endpoint =
          type === "artist"
            ? `${baseUrl}/library/sections/${key}/albums`
            : `${baseUrl}/library/sections/${key}/all`

        try {
          const res = await fetch(endpoint, { headers })
          if (!res.ok) return

          const text = await res.text()
          const sizeMatch = text.match(
            /<MediaContainer[^>]*(?:totalSize|size)="(\d+)"/
          )
          const count = sizeMatch ? parseInt(sizeMatch[1], 10) : 0

          if (type === "movie") movies += count
          else if (type === "show") tvShows += count
          else if (type === "artist") albums += count
        } catch {
          // Ignore errors for individual library sections
        }
      })
    )

    const sessions: PlexSession[] = []
    if (showActiveStreams) {
      // Split by Video elements to capture full context including nested elements
      const videoSections = sessionsText.split(/<Video\s/)
      const videoElements = videoSections
        .slice(1)
        .map((section) => "<Video " + section)

      for (const videoEl of videoElements) {
        const getAttr = (name: string): string | null => {
          const m = videoEl.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))
          return m ? m[1] : null
        }

        const title = decodeXMLEntities(getAttr("title") ?? "")
        const grandparentTitle = getAttr("grandparentTitle")
          ? decodeXMLEntities(getAttr("grandparentTitle")!)
          : null
        const type = getAttr("type")
        const viewOffset = getAttr("viewOffset")
        const duration = getAttr("duration")

        // Extract season/episode numbers for TV episodes
        const seasonNumber = getAttr("parentIndex")
          ? parseInt(getAttr("parentIndex")!, 10)
          : null
        const episodeNumber = getAttr("index")
          ? parseInt(getAttr("index")!, 10)
          : null

        // Use shared formatMediaTitle for consistent formatting across all media adapters
        const { title: formattedTitle, subtitle } = formatMediaTitle(title, {
          type: type ?? undefined,
          seriesName: grandparentTitle ?? undefined,
          season: seasonNumber,
          episode: episodeNumber,
          albumArtist: getAttr("originalTitle") ?? undefined,
          album: getAttr("parentTitle") ?? undefined,
        })

        const userMatch = videoEl.match(/<User[^>]*title="([^"]*)"/)
        const user = userMatch ? decodeXMLEntities(userMatch[1]) : "Unknown"

        const stateMatch = videoEl.match(/<Player[^>]*state="([^"]*)"/)
        const state = stateMatch?.[1] === "paused" ? "paused" : "playing"

        // Plex API returns viewOffset and duration in milliseconds
        const progress = viewOffset ? parseInt(viewOffset, 10) / 1000 : 0
        const durationSec = duration ? parseInt(duration, 10) / 1000 : 0

        // Safety check: ensure progress doesn't exceed duration
        const safeProgress =
          durationSec > 0 ? Math.min(progress, durationSec) : progress

        // Extract transcoding info from Plex XML
        // Plex uses videoDecision="direct play", "transcode", or "copy"
        const videoDecision = getAttr("videoDecision")?.toLowerCase()
        const isDirectPlay = videoDecision === "direct play"
        const isTranscoding = videoDecision === "transcode"

        // Check for hardware transcoding in TranscodeSession
        const transcodeHw =
          videoEl.includes('hwAccel="1"') || videoEl.includes('hwDecode="1"')
        const transcodingInfo = isTranscoding
          ? {
              isDirect: false,
              hardwareDecoding: transcodeHw,
              hardwareEncoding: transcodeHw,
            }
          : isDirectPlay
            ? {
                isDirect: true,
                hardwareDecoding: false,
                hardwareEncoding: false,
              }
            : undefined

        sessions.push({
          title: formattedTitle,
          subtitle,
          user,
          progress: safeProgress,
          duration: durationSec,
          state,
          streamId: getAttr("ratingKey") ?? undefined,
          transcoding: transcodingInfo,
        })
      }
    }

    return {
      _status: "ok",
      streams,
      albums,
      movies,
      tvShows,
      showActiveStreams,
      sessions,
    }
  },
  toPayload: plexToPayload,
}
