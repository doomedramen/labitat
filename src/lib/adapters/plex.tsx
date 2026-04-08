import type { ServiceDefinition } from "./types"
import { ActiveStreamList, StatGrid } from "@/components/widgets"

type PlexSession = {
  title: string
  full_title: string
  user: string
  progress: number
  duration: number
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
      <StatGrid items={statsItems} />

      {showActiveStreams && sessions && sessions.length > 0 && (
        <div className="mx-1 flex flex-col pb-1">
          <ActiveStreamList
            streams={sessions.map((session) => ({
              title: session.full_title,
              user: session.user,
              progress: session.progress,
              duration: session.duration,
              state: session.state,
            }))}
          />
        </div>
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
      const videoElements = sessionsText.match(/<Video[^>]*>/g) || []

      for (const videoEl of videoElements) {
        const getAttr = (name: string): string | null => {
          const m = videoEl.match(new RegExp(`\\b${name}="([^"]*)"`, "i"))
          return m ? m[1] : null
        }

        const title = getAttr("title") ?? ""
        const grandparentTitle = getAttr("grandparentTitle")
        const originalTitle = getAttr("originalTitle")
        const librarySectionTitle = getAttr("librarySectionTitle")
        const type = getAttr("type")
        const viewOffset = getAttr("viewOffset")
        const duration = getAttr("duration")

        let fullTitle = title
        if (grandparentTitle) {
          const episodeTitle =
            title === grandparentTitle ? originalTitle || title : title
          fullTitle = `${grandparentTitle} - ${episodeTitle}`
        } else if (type === "movie") {
          if (librarySectionTitle && title === librarySectionTitle) {
            fullTitle = originalTitle || title
          } else if (title.includes("(") && originalTitle) {
            fullTitle = originalTitle
          } else {
            fullTitle = title
          }
        }

        const videoIndex = sessionsText.indexOf(videoEl)
        const nextVideoIndex = sessionsText.indexOf("<Video", videoIndex + 1)
        const sectionToSearch =
          nextVideoIndex > 0
            ? sessionsText.slice(videoIndex, nextVideoIndex)
            : sessionsText.slice(videoIndex)

        const userMatch = sectionToSearch.match(/<User[^>]*title="([^"]*)"/)
        const user = userMatch ? userMatch[1] : "Unknown"

        const stateMatch = sectionToSearch.match(/<Player[^>]*state="([^"]*)"/)
        const state = stateMatch?.[1] === "paused" ? "paused" : "playing"

        const progress = viewOffset ? parseInt(viewOffset, 10) / 1000 : 0
        const durationSec = duration ? parseInt(duration, 10) / 1000 : 0

        sessions.push({
          title,
          full_title: fullTitle,
          user,
          progress,
          duration: durationSec,
          state,
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
  Widget: PlexWidget,
}
