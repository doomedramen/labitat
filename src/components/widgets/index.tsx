"use client"

/**
 * Shared widget components for service adapters.
 * These provide consistent styling across different services.
 */

import { cn } from "@/lib/utils"
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
  icon?: React.ReactNode
  valueClassName?: string
}

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

// ── Active streams ────────────────────────────────────────────────────────────

export type ActiveStream = {
  title: string
  user: string
  progress: number
  duration: number
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
      <TooltipTrigger asChild>
        <div
          className={cn(
            "flex items-center gap-2 rounded-md px-2 py-1 text-xs",
            "hover:bg-secondary/50"
          )}
        >
          {state === "paused" ? (
            <Pause className="h-3 w-3 shrink-0 text-secondary-foreground/50" />
          ) : (
            <Play className="h-3 w-3 shrink-0 text-secondary-foreground/50" />
          )}
          <span className="min-w-0 flex-[3] truncate font-medium">{title}</span>
          <span className="min-w-0 flex-1 truncate text-secondary-foreground/60">
            ({user})
          </span>
          <div className="flex items-center gap-1 font-mono text-secondary-foreground/60 tabular-nums">
            <Clock className="h-3 w-3 shrink-0" />
            {formatDuration(progress)}
          </div>
          {/* Progress bar background */}
          <div
            className="absolute bottom-0 left-0 h-0.5 bg-primary/30"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  )
}

export function ActiveStreamList({ streams }: { streams: ActiveStream[] }) {
  if (streams.length === 0) return null

  const sorted = [...streams].sort((a, b) =>
    a.title.localeCompare(b.title, undefined, { sensitivity: "base" })
  )

  return (
    <div className="flex flex-col gap-0.5">
      {sorted.map((stream, idx) => (
        <ActiveStreamItem key={idx} {...stream} />
      ))}
    </div>
  )
}

// ── Download items ────────────────────────────────────────────────────────────

export type DownloadItem = {
  title: string
  progress: number
  timeLeft?: string
  activity?: string
  size?: string
}

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
      <TooltipTrigger asChild>
        <div className="relative flex h-5 items-center gap-0 overflow-hidden rounded-md px-2 text-xs">
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
            {timeLeft ? `${activity ?? "downloading"} - ${timeLeft}` : activity}
          </div>
        </div>
      </TooltipTrigger>
      <TooltipContent side="top" className="max-w-xs text-xs">
        {tooltipText}
      </TooltipContent>
    </Tooltip>
  )
}

export function DownloadList({ downloads }: { downloads: DownloadItem[] }) {
  if (downloads.length === 0) return null

  return (
    <div className="flex flex-col gap-0.5">
      {downloads.map((download, idx) => (
        <DownloadItem key={idx} {...download} />
      ))}
    </div>
  )
}
