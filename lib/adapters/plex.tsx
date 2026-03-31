import type { ServiceDefinition } from "./types"
import { ActiveStreamList } from "./widgets"

type PlexSession = {
  title: string
  full_title: string
  user: string
  progress: number
  state?: "playing" | "paused"
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

function PlexWidget({
  streams,
  albums,
  movies,
  tvShows,
  showActiveStreams,
  sessions,
}: PlexData) {
  const statsItems = [
    { value: streams, label: "Active Streams" },
    { value: albums, label: "Albums" },
    { value: movies, label: "Movies" },
    { value: tvShows, label: "TV Shows" },
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
      placeholder: "https://plex.home.lab",
      helperText: "The base URL of your Plex instance",
    },
    {
      key: "token",
      label: "Token",
      type: "password",
      required: true,
      placeholder: "Your Plex token",
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

    // Get sessions and library sections
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

    // Parse XML response (Plex uses XML)
    const sessionsText = await sessionsRes.text()
    const libraryText = await libraryRes.text()

    // Simple XML parsing for MediaContainer
    const streamMatch = sessionsText.match(/size="(\d+)"/)

    // Parse library sections by type
    const dirRegex =
      /<Directory[^>]*type="([^"]*)"[^>]*leafCount="(\d+)"[^>]*>/g
    let albums = 0
    let movies = 0
    let tvShows = 0
    let dirMatch
    while ((dirMatch = dirRegex.exec(libraryText)) !== null) {
      const [, type, count] = dirMatch
      const countNum = parseInt(count, 10)
      if (type === "artist") {
        albums += countNum
      } else if (type === "movie") {
        movies += countNum
      } else if (type === "show") {
        tvShows += countNum
      }
    }

    const streams = streamMatch ? parseInt(streamMatch[1], 10) : 0

    // Parse active sessions if enabled
    const sessions: PlexSession[] = []
    if (showActiveStreams) {
      // Extract each Video element and its attributes
      // viewOffset is on the Video element, not Media
      const videoElements = sessionsText.match(/<Video[^>]*>/g) || []

      for (const videoEl of videoElements) {
        // Extract attributes from the Video element
        const getAttr = (name: string): string | null => {
          const m = videoEl.match(new RegExp(`${name}="([^"]*)"`, "i"))
          return m ? m[1] : null
        }

        const title = getAttr("title") ?? ""
        const grandparentTitle = getAttr("grandparentTitle") // Show name for episodes
        const parentTitle = getAttr("parentTitle") // Season name for episodes
        const originalTitle = getAttr("originalTitle") // Original title (fallback)
        const type = getAttr("type") // "movie" or "episode"
        const viewOffset = getAttr("viewOffset") // Progress in milliseconds

        // Build display title
        // For TV episodes: "Show: Season - Episode"
        // For movies: just the movie title
        let fullTitle = title
        if (grandparentTitle) {
          // Extract season/episode info from parentTitle (e.g., "Season 2" -> "S02")
          const seasonMatch = parentTitle?.match(/Season\s*(\d+)/i)
          const seasonStr = seasonMatch
            ? `S${seasonMatch[1].padStart(2, "0")}`
            : parentTitle
          fullTitle = `${grandparentTitle}: ${seasonStr} - ${title}`
        } else if (type === "movie") {
          // For movies, use title unless it looks like a library name
          // Library names often contain parens like "Films (Apple TV)"
          if (title.includes("(") && originalTitle) {
            fullTitle = originalTitle
          } else {
            fullTitle = title
          }
        }

        // Also find the user from the associated Player element
        // Player comes after Video in the XML, so we need to find it in the full response
        const videoIndex = sessionsText.indexOf(videoEl)
        const nextVideoIndex = sessionsText.indexOf("<Video", videoIndex + 1)
        const sectionToSearch =
          nextVideoIndex > 0
            ? sessionsText.slice(videoIndex, nextVideoIndex)
            : sessionsText.slice(videoIndex)

        const playerMatch = sectionToSearch.match(/<Player[^>]*title="([^"]*)"/)
        const user = playerMatch ? playerMatch[1] : "Unknown"

        // Check if paused (look for state="paused" in Player element)
        const stateMatch = sectionToSearch.match(/<Player[^>]*state="([^"]*)"/)
        const state = stateMatch?.[1] === "paused" ? "paused" : "playing"

        // Convert viewOffset from milliseconds to seconds
        const progress = viewOffset ? parseInt(viewOffset, 10) / 1000 : 0

        sessions.push({
          title,
          full_title: fullTitle,
          user,
          progress,
          state,
        })
      }
    }

    return {
      _status: "ok" as const,
      streams,
      albums,
      movies,
      tvShows,
      showActiveStreams,
      sessions,
    }
  },

  Widget: PlexWidget,
}
