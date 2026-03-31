"use client"

/**
 * Shared widget components for service adapters.
 * These provide consistent styling across different services.
 */

import { Clock, Pause, Play } from "lucide-react"

export type ActiveStream = {
  /** Full display title (e.g., "Show: S01 - Episode Title") */
  title: string
  /** User who is streaming */
  user: string
  /** Progress in seconds */
  progress: number
  /** Playback state - 'playing' or 'paused' */
  state?: "playing" | "paused"
}

export type DownloadItem = {
  /** Full display title (e.g., filename or torrent name) */
  title: string
  /** Progress percentage (0-100) */
  progress: number
  /** Time remaining (e.g., "0:15:30" or "5 min") */
  timeLeft?: string
  /** Current activity/state (e.g., "downloading", "queued") */
  activity?: string
  /** Size information (e.g., "1.5 GB") */
  size?: string
}

function formatDuration(seconds: number): string {
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)

  if (h > 0) {
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  }
  return `${m}:${s.toString().padStart(2, "0")}`
}

/**
 * Displays a single active stream with title, user, and progress.
 * Styled consistently with other widget stat items.
 */
export function ActiveStreamItem({
  title,
  user,
  progress,
  state,
}: ActiveStream) {
  return (
    <div className="flex items-center gap-2 rounded-md bg-muted/50 px-2 py-1">
      {state === "paused" ? (
        <Pause className="h-3 w-3 shrink-0 text-muted-foreground" />
      ) : (
        <Play className="h-3 w-3 shrink-0 text-muted-foreground" />
      )}
      <span className="min-w-0 truncate font-medium">{title}</span>
      <span className="text-muted-foreground">({user})</span>
      <div className="flex items-center gap-1 font-mono text-muted-foreground tabular-nums">
        <Clock className="h-3 w-3 shrink-0" />
        {formatDuration(progress)}
      </div>
    </div>
  )
}

/**
 * Container for displaying a list of active streams.
 */
export function ActiveStreamList({ streams }: { streams: ActiveStream[] }) {
  if (streams.length === 0) return null

  return (
    <div className="mt-2 flex flex-row flex-wrap gap-1.5 border-t pt-2">
      {streams.map((stream, idx) => (
        <ActiveStreamItem key={idx} {...stream} />
      ))}
    </div>
  )
}

/**
 * Displays a single download item with progress bar.
 * Styled like Homepage's queueEntry component.
 */
export function DownloadItem({
  title,
  progress,
  timeLeft,
  activity,
  size,
}: DownloadItem) {
  return (
    <div className="relative m-1 flex h-5 w-full rounded-md bg-muted/50 px-1">
      <div
        className="absolute z-0 -ml-1 h-5 rounded-md bg-muted"
        style={{
          width: `${Math.min(100, Math.max(0, progress))}%`,
        }}
      />
      <div className="relative z-10 mr-2 ml-2 h-4 grow self-center text-xs">
        <div className="absolute w-full overflow-hidden text-left text-ellipsis whitespace-nowrap">
          {title}
        </div>
      </div>
      <div className="z-10 mr-1.5 flex justify-end self-center overflow-hidden pl-1 text-xs text-ellipsis whitespace-nowrap text-muted-foreground">
        {size && `${size} - `}
        {timeLeft ? `${activity ?? "downloading"} - ${timeLeft}` : activity}
      </div>
    </div>
  )
}

/**
 * Container for displaying a list of active downloads.
 */
export function DownloadList({ downloads }: { downloads: DownloadItem[] }) {
  if (downloads.length === 0) return null

  return (
    <div className="mt-2 border-t pt-2">
      {downloads.map((download, idx) => (
        <DownloadItem key={idx} {...download} />
      ))}
    </div>
  )
}
