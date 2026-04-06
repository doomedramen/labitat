"use client"

/**
 * Shared widget components for service adapters.
 * These provide consistent styling across different services.
 */

import { cn } from "@/lib/utils"
import { List, ListItem } from "@/components/ui/list"
import { Clock, Pause, Play } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

// ── Stat grid ─────────────────────────────────────────────────────────────────

export type StatItem = {
  value: string | number
  label: string
  /** Optional lucide icon rendered above the value */
  icon?: React.ReactNode
  /** Tailwind class for the value colour. Defaults to text-primary-foreground. Use text-destructive for error states. */
  valueClassName?: string
}

/**
 * A single stat tile: optional icon, value, label.
 */
export function StatCard({ value, label, icon, valueClassName }: StatItem) {
  return (
    <div className="flex h-full flex-col items-center justify-center rounded-md bg-secondary px-2 py-1.5 text-center text-secondary-foreground">
      {icon && <div className="mb-0.5">{icon}</div>}
      <span
        className={cn(
          "font-medium tabular-nums",
          valueClassName ?? "text-secondary-foreground"
        )}
      >
        {value}
      </span>
      <span className="text-secondary-foreground/60">{label}</span>
    </div>
  )
}

/**
 * Responsive grid of StatCards. Defaults to auto-fit columns (min 60px).
 * Pass `cols` to fix the number of columns (useful when wrapping to 2 rows).
 */
export function StatGrid({
  items,
  cols,
}: {
  items: StatItem[]
  cols?: number
}) {
  if (items.length === 0) return null

  return (
    <div
      className="grid gap-1.5 text-xs"
      style={{
        gridTemplateColumns: cols
          ? `repeat(${cols}, 1fr)`
          : "repeat(auto-fit, minmax(60px, 1fr))",
      }}
    >
      {items.map((item) => (
        <StatCard key={item.label} {...item} />
      ))}
    </div>
  )
}

export type ActiveStream = {
  /** Full display title (e.g., "Show: S01 - Episode Title") */
  title: string
  /** User who is streaming */
  user: string
  /** Progress in seconds */
  progress: number
  /** Total duration in seconds */
  duration: number
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
  duration,
  state,
}: ActiveStream) {
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0
  const tooltipText = `${title} (${user}) - ${formatDuration(progress)}`

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <ListItem progress={progressPercent}>
            {state === "paused" ? (
              <Pause className="h-3 w-3 shrink-0 text-secondary-foreground/50" />
            ) : (
              <Play className="h-3 w-3 shrink-0 text-secondary-foreground/50" />
            )}
            <span className="min-w-0 flex-[3] truncate font-medium">
              {title}
            </span>
            <span className="min-w-0 flex-1 truncate text-secondary-foreground/60">
              ({user})
            </span>
            <div className="flex items-center gap-1 font-mono text-secondary-foreground/60 tabular-nums">
              <Clock className="h-3 w-3 shrink-0" />
              {formatDuration(progress)}
            </div>
          </ListItem>
        }
      />
      <TooltipContent side="top" className="max-w-xs text-xs">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Container for displaying a list of active streams.
 */
export function ActiveStreamList({ streams }: { streams: ActiveStream[] }) {
  if (streams.length === 0) return null

  const sorted = [...streams].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
  )

  return (
    <List>
      {sorted.map((stream, idx) => (
        <ActiveStreamItem key={idx} {...stream} />
      ))}
    </List>
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
  const tooltipText = `${title}${size ? ` - ${size}` : ""}${timeLeft ? ` - ${timeLeft}` : ""}`

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <ListItem className="relative h-5 gap-0! p-0!">
            <div
              className="absolute z-0 h-5 rounded-md bg-muted"
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
              {timeLeft
                ? `${activity ?? "downloading"} - ${timeLeft}`
                : activity}
            </div>
          </ListItem>
        }
      />
      <TooltipContent side="top" className="max-w-xs text-xs">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  )
}

/**
 * Container for displaying a list of active downloads.
 */
export function DownloadList({ downloads }: { downloads: DownloadItem[] }) {
  if (downloads.length === 0) return null

  return (
    <List>
      {downloads.map((download, idx) => (
        <DownloadItem key={idx} {...download} />
      ))}
    </List>
  )
}
