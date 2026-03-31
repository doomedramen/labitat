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
    <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1 text-center">
      <div className="flex w-full items-center gap-1">
        {state === "paused" ? (
          <Pause className="h-3 w-3 shrink-0 text-muted-foreground" />
        ) : (
          <Play className="h-3 w-3 shrink-0 text-muted-foreground" />
        )}
        <span className="min-w-0 truncate font-medium">{title}</span>
      </div>
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
    <div className="mt-2 grid grid-cols-1 gap-1.5 border-t pt-2">
      {streams.map((stream, idx) => (
        <ActiveStreamItem key={idx} {...stream} />
      ))}
    </div>
  )
}
