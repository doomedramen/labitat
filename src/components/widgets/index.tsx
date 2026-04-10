"use client"

/**
 * Shared widget components for service adapters.
 * These provide consistent styling across different services.
 */

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
} from "@dnd-kit/core"
import {
  useSortable,
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import type { DragEndEvent } from "@dnd-kit/core"
import { useCallback } from "react"
import { cn } from "@/lib/utils"
import { Clock, Pause, Play, Monitor, Cpu } from "lucide-react"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { StatDisplayMode } from "@/lib/types"

// ── Resource bar ──────────────────────────────────────────────────────────────

export type ResourceBarProps = {
  label: string
  value: number // 0–100 percentage
  hint?: string // shown alongside value (e.g. "12.4 GB")
  warningAt?: number
  criticalAt?: number
}

export function ResourceBar({
  label,
  value,
  hint,
  warningAt = 70,
  criticalAt = 90,
}: ResourceBarProps) {
  const pct = Math.min(100, Math.max(0, value ?? 0))
  const isCritical = pct >= criticalAt
  const isWarning = pct >= warningAt

  const barColor = isCritical
    ? "bg-destructive"
    : isWarning
      ? "bg-amber-500"
      : "bg-primary"
  const valueColor = isCritical
    ? "text-destructive"
    : isWarning
      ? "text-amber-500"
      : "text-secondary-foreground"

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-secondary-foreground/60">{label}</span>
        <span className={cn("font-medium tabular-nums", valueColor)}>
          {pct}%
          {hint && (
            <span className="ml-1.5 font-normal text-secondary-foreground/50">
              {hint}
            </span>
          )}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barColor
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  )
}

/**
 * Dual resource bar showing used vs free (like Homepage's ChartDual for memory)
 * Shows both the used percentage (colored bar) and free amount (text hint)
 */
export type ResourceBarDualProps = {
  label: string
  used: number // 0-100 percentage
  total?: string // Human-readable total (e.g., "16.0 GB")
  free?: string // Human-readable free amount (e.g., "4.2 GB")
  warningAt?: number
  criticalAt?: number
}

export function ResourceBarDual({
  label,
  used,
  total,
  free,
  warningAt = 70,
  criticalAt = 90,
}: ResourceBarDualProps) {
  const pct = Math.min(100, Math.max(0, used ?? 0))
  const isCritical = pct >= criticalAt
  const isWarning = pct >= warningAt

  const barColor = isCritical
    ? "bg-destructive"
    : isWarning
      ? "bg-amber-500"
      : "bg-primary"
  const valueColor = isCritical
    ? "text-destructive"
    : isWarning
      ? "text-amber-500"
      : "text-secondary-foreground"

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-secondary-foreground/60">{label}</span>
        <span className={cn("font-medium tabular-nums", valueColor)}>
          {pct}% used
          {free && (
            <span className="ml-1.5 font-normal text-secondary-foreground/50">
              ({free} free)
            </span>
          )}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barColor
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {total && (
        <div className="text-right text-[10px] text-secondary-foreground/40">
          Total: {total}
        </div>
      )}
    </div>
  )
}

// ── Stat grid ─────────────────────────────────────────────────────────────────

export type StatItem = {
  /** Stable identifier for DnD and React keys */
  id: string
  value: string | number
  label: string
  /** Icon component — rendered with className="h-3 w-3" automatically */
  icon?: React.ComponentType<{ className?: string }>
  /** When set, the label text is hidden and shown only in a tooltip */
  tooltip?: string
  valueClassName?: string
}

interface StatCardProps extends StatItem {
  displayMode?: StatDisplayMode
  sortable?: boolean
  editMode?: boolean
}

export function StatCard({
  id,
  value,
  label,
  icon,
  tooltip,
  valueClassName,
  displayMode = "label",
  sortable = false,
  editMode = false,
}: StatCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: !sortable })

  const style: React.CSSProperties = sortable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : undefined,
      }
    : {}

  const showIcon = displayMode === "icon" && icon
  const showLabel = displayMode === "label"

  // When sortable+editMode, make the whole card the drag activator
  const dragProps = sortable && editMode ? { ...attributes, ...listeners } : {}
  // Must be memoized — inline arrow functions cause ref reset (null then element)
  // on every render, which unregisters/re-registers the node during drag.
  const combinedRef = useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el)
      if (sortable && editMode) setActivatorNodeRef(el)
    },
    [setNodeRef, setActivatorNodeRef, sortable, editMode]
  )

  const inner = (
    <div
      ref={combinedRef}
      style={style}
      {...dragProps}
      className={cn(
        "flex h-full flex-col items-center justify-center rounded-md bg-secondary px-2 py-1.5 text-center text-secondary-foreground select-none",
        sortable && editMode && "cursor-grab active:cursor-grabbing"
      )}
    >
      <span
        className={cn(
          "font-medium tabular-nums",
          valueClassName ?? "text-secondary-foreground"
        )}
      >
        {value}
      </span>
      {showIcon && icon && (
        <div className="mt-0.5 text-secondary-foreground/50">
          {(() => {
            const Icon = icon
            return <Icon className="h-3 w-3" />
          })()}
        </div>
      )}
      {showLabel ? (
        <span className="text-secondary-foreground/60">{label}</span>
      ) : !showIcon && tooltip ? (
        <span className="sr-only">{tooltip}</span>
      ) : null}
    </div>
  )

  if (tooltip) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{inner}</TooltipTrigger>
        <TooltipContent side="top" className="text-xs">
          {tooltip}
        </TooltipContent>
      </Tooltip>
    )
  }
  return inner
}

export function StatGrid({
  items,
  cols,
  displayMode = "label",
  sortable = false,
  editMode = false,
  onReorder,
}: {
  items: StatItem[]
  cols?: number
  displayMode?: StatDisplayMode
  sortable?: boolean
  editMode?: boolean
  onReorder?: (activeId: string, overId: string) => void
}) {
  const dndEnabled = sortable && editMode && items.length > 1

  // Hooks must be called unconditionally
  const sensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  })
  const sensors = useSensors(sensor)

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || !onReorder) return
    if (active.id !== over.id) {
      onReorder(active.id as string, over.id as string)
    }
  }

  if (items.length === 0) return null

  const inner = (
    <div
      className="grid gap-1.5 text-xs"
      style={{
        gridTemplateColumns: cols
          ? `repeat(${cols}, 1fr)`
          : "repeat(auto-fit, minmax(60px, 1fr))",
      }}
    >
      {items.map((item) => (
        <StatCard
          key={item.id}
          {...item}
          displayMode={displayMode}
          sortable={dndEnabled}
          editMode={editMode}
        />
      ))}
    </div>
  )

  if (dndEnabled) {
    return (
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={horizontalListSortingStrategy}
        >
          {inner}
        </SortableContext>
      </DndContext>
    )
  }

  return inner
}

// ── Active streams ────────────────────────────────────────────────────────────

export type ActiveStream = {
  title: string
  /** Series / show name for TV episodes */
  subtitle?: string
  user: string
  progress: number
  duration: number
  state?: "playing" | "paused"
  /** Stream ID for media control callbacks */
  streamId?: string
  /** Transcoding information (like Homepage's Jellyfin/Plex widgets) */
  transcoding?: {
    /** True if playing without transcoding (direct play/stream) */
    isDirect?: boolean
    /** True if hardware decoding is enabled */
    hardwareDecoding?: boolean
    /** True if hardware encoding is enabled */
    hardwareEncoding?: boolean
  }
}

interface ActiveStreamItemProps extends ActiveStream {
  /** Callback for play/pause toggle (like Homepage's media control) */
  onTogglePlayback?: (streamId: string) => void
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
  subtitle,
  user,
  progress,
  duration,
  state,
  streamId,
  transcoding,
  onTogglePlayback,
}: ActiveStreamItemProps) {
  const progressPercent = duration > 0 ? (progress / duration) * 100 : 0
  const remaining = Math.max(0, duration - progress)
  const displayTitle = subtitle ? `${subtitle} · ${title}` : title

  const handlePlayPause = () => {
    if (streamId && onTogglePlayback) {
      onTogglePlayback(streamId)
    }
  }

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "relative flex w-full items-center gap-2 overflow-hidden rounded-md bg-secondary/30 px-2 py-1 text-xs",
            "hover:bg-secondary/50"
          )}
        >
          {/* Play/Pause button with media control support */}
          {onTogglePlayback && streamId ? (
            <button
              type="button"
              onClick={handlePlayPause}
              className="shrink-0 cursor-pointer text-secondary-foreground/50 hover:text-secondary-foreground/70"
              aria-label={state === "paused" ? "Play" : "Pause"}
            >
              {state === "paused" ? (
                <Play className="h-3 w-3" />
              ) : (
                <Pause className="h-3 w-3" />
              )}
            </button>
          ) : state === "paused" ? (
            <Pause className="h-3 w-3 shrink-0 text-secondary-foreground/50" />
          ) : (
            <Play className="h-3 w-3 shrink-0 text-secondary-foreground/50" />
          )}
          <div className="flex min-w-0 flex-1 items-center gap-2 overflow-hidden">
            {subtitle && (
              <span className="shrink-0 text-secondary-foreground/50">
                {subtitle}
              </span>
            )}
            {subtitle && (
              <span className="shrink-0 text-secondary-foreground/30">·</span>
            )}
            <span className="min-w-0 truncate font-medium">{title}</span>
          </div>
          {/* Transcoding info icons (like Homepage's Jellyfin widget) */}
          <div className="flex shrink-0 items-center gap-1">
            {transcoding && (
              <>
                {transcoding.isDirect ? (
                  <span title="Direct play">
                    <Monitor className="h-3 w-3 text-secondary-foreground/50" />
                  </span>
                ) : (
                  <>
                    {!transcoding.hardwareDecoding ||
                    !transcoding.hardwareEncoding ? (
                      <span title="Software transcoding">
                        <Cpu className="h-3 w-3 text-secondary-foreground/50" />
                      </span>
                    ) : (
                      <span title="Hardware transcoding">
                        <Cpu className="h-3 w-3 text-secondary-foreground/50" />
                      </span>
                    )}
                  </>
                )}
              </>
            )}
            <div className="flex items-center gap-1 font-mono text-secondary-foreground/60 tabular-nums">
              <Clock className="h-3 w-3" />
              {formatDuration(remaining)}
            </div>
          </div>
          {/* Playback progress bar */}
          <div
            className="absolute bottom-0 left-0 h-px bg-primary/50"
            style={{ width: `${progressPercent}%` }}
          />
        </div>
      </TooltipTrigger>
      <TooltipContent
        side="top"
        className="max-w-xs text-xs"
        sideOffset={8}
        avoidCollisions
      >
        <div className="flex flex-col gap-1">
          <div className="font-medium">{displayTitle}</div>
          <div className="text-secondary-foreground/70">User: {user}</div>
          {duration > 0 && (
            <div className="text-secondary-foreground/60">
              {formatDuration(progress)} / {formatDuration(duration)}
            </div>
          )}
          {transcoding && (
            <div className="text-secondary-foreground/60">
              {transcoding.isDirect
                ? "Direct play"
                : transcoding.hardwareDecoding && transcoding.hardwareEncoding
                  ? "Hardware transcoding"
                  : "Software transcoding"}
            </div>
          )}
        </div>
      </TooltipContent>
    </Tooltip>
  )
}

export function ActiveStreamList({
  streams,
  onTogglePlayback,
}: {
  streams: ActiveStream[]
  onTogglePlayback?: (streamId: string) => void
}) {
  if (streams.length === 0) return null

  // Sort by subtitle (show name) then title (episode), falling back to title only
  const sorted = [...streams].sort((a, b) => {
    const aKey = `${a.subtitle ?? ""}\x00${a.title}`
    const bKey = `${b.subtitle ?? ""}\x00${b.title}`
    return aKey.localeCompare(bKey, undefined, { sensitivity: "base" })
  })

  // Homepage feature: expand single stream to show more details
  // Note: expandSingleStream prop can be used to enable/disable this behavior

  return (
    <div className="flex w-full flex-col gap-0.5">
      {sorted.map((stream, idx) => (
        <ActiveStreamItem
          key={idx}
          {...stream}
          onTogglePlayback={onTogglePlayback}
        />
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

  // Sort downloads: active downloads first, then by progress (highest first)
  // This matches Homepage's behavior where downloading items are prioritized
  const sorted = [...downloads].sort((a, b) => {
    const isActiveA =
      a.activity?.toLowerCase().includes("download") ||
      a.activity?.toLowerCase().includes("import")
    const isActiveB =
      b.activity?.toLowerCase().includes("download") ||
      b.activity?.toLowerCase().includes("import")

    // Active downloads come first
    if (isActiveA && !isActiveB) return -1
    if (!isActiveA && isActiveB) return 1

    // Then sort by progress (descending)
    return b.progress - a.progress
  })

  return (
    <div className="flex flex-col gap-0.5">
      {sorted.map((download, idx) => (
        <DownloadItem key={idx} {...download} />
      ))}
    </div>
  )
}

export { WidgetContainer } from "./widget-container"
