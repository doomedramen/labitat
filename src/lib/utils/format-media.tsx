import type { ActiveStream } from "@/components/widgets"

/**
 * Format a media title based on its type (TV episode, music track, or movie).
 * Used by Plex, Jellyfin, Emby, and Tautulli adapters.
 */
export function formatMediaTitle(
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

/**
 * Format seconds to HH:MM:SS string (like Homepage's media widgets).
 * e.g., 3661 → "1:01:01"
 * e.g., 120 → "2:00"
 */
export function formatMediaTime(seconds: number): string {
  if (seconds <= 0 || !isFinite(seconds)) return "0:00"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }
  return `${m}:${s.toString().padStart(2, "0")}`
}

/**
 * Build a tooltip element showing all active streams.
 * Used by Plex, Jellyfin, Emby, and Tautulli adapters.
 */
export function buildStreamsTooltip(sessions: ActiveStream[]): React.ReactNode {
  if (!sessions.length) return undefined

  return (
    <div className="flex flex-col gap-1 font-medium">
      {sessions.map((session, i) => {
        const displayTitle = session.subtitle
          ? `${session.subtitle} · ${session.title}`
          : session.title
        return (
          <div key={session.streamId ?? i} className="flex flex-col gap-1">
            <div>{displayTitle}</div>
            <div className="text-secondary-foreground/70">
              User: {session.user}
            </div>
            {session.duration > 0 && (
              <div className="text-secondary-foreground/60">
                {formatMediaTime(session.progress)} /{" "}
                {formatMediaTime(session.duration)}
              </div>
            )}
          </div>
        )
      })}
    </div>
  )
}
