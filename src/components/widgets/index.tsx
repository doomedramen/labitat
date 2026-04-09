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
import { GripVertical } from "lucide-react"
import { cn } from "@/lib/utils"
import { Clock, Pause, Play } from "lucide-react"
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

// ── Stat grid ─────────────────────────────────────────────────────────────────

export type StatItem = {
  /** Stable identifier for DnD and React keys */
  id: string
  value: string | number
  label: string
  icon?: React.ReactNode
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
  } = useSortable({ id })

  const style: React.CSSProperties = sortable
    ? {
        transform: CSS.Transform.toString(transform),
        transition,
        opacity: isDragging ? 0.35 : undefined,
      }
    : {}

  const showIcon = displayMode === "icon" && icon
  const showLabel = displayMode === "label"

  const inner = (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "flex h-full flex-col items-center justify-center rounded-md bg-secondary px-2 py-1.5 text-center text-secondary-foreground",
        sortable && "relative"
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
      {showIcon && (
        <div className="mt-0.5 text-secondary-foreground/50">{icon}</div>
      )}
      {tooltip ? (
        <span className="sr-only">{tooltip}</span>
      ) : (
        showLabel && (
          <span className="text-secondary-foreground/60">{label}</span>
        )
      )}
      {sortable && editMode && (
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="absolute -top-1 -right-1 cursor-grab rounded-sm p-0.5 text-muted-foreground hover:text-foreground"
          aria-label={`Drag to reorder ${label}`}
        >
          <GripVertical className="h-3 w-3" />
        </button>
      )}
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
  const remaining = Math.max(0, duration - progress)
  const tooltipText =
    duration > 0
      ? `${title} · ${user} · ${formatDuration(progress)} / ${formatDuration(duration)}`
      : `${title} · ${user}`

  return (
    <Tooltip>
      <TooltipTrigger asChild>
        <div
          className={cn(
            "relative flex w-full items-center gap-2 overflow-hidden rounded-md bg-secondary/30 px-2 py-1 text-xs",
            "hover:bg-secondary/50"
          )}
        >
          {state === "paused" ? (
            <Pause className="h-3 w-3 shrink-0 text-secondary-foreground/50" />
          ) : (
            <Play className="h-3 w-3 shrink-0 text-secondary-foreground/50" />
          )}
          <div className="flex min-w-0 flex-1 items-center gap-2">
            <span className="truncate font-medium">{title}</span>
            <span className="shrink-0 truncate text-secondary-foreground/60">
              ({user})
            </span>
          </div>
          <div className="flex shrink-0 items-center gap-1 font-mono text-secondary-foreground/60 tabular-nums">
            <Clock className="h-3 w-3" />-{formatDuration(remaining)}
          </div>
          {/* Playback progress bar */}
          <div
            className="absolute bottom-0 left-0 h-px bg-primary/50"
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
    <div className="flex w-full flex-col gap-0.5">
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
