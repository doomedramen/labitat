/**
 * Editable stat card grid with drag-to-reorder and unused area.
 * Used in the item dialog for configuring stat card visibility and order.
 */

"use client"

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  useDroppable,
  DragOverlay,
  type DragEndEvent,
  type DragStartEvent,
} from "@dnd-kit/core"
import {
  useSortable,
  horizontalListSortingStrategy,
  SortableContext,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { useCallback, useMemo, useState } from "react"
import { cn } from "@/lib/utils"
import {
  HoverCard,
  HoverCardTrigger,
  HoverCardContent,
} from "@/components/ui/hover-card"
import { BlockLinkPropagation } from "@/components/dashboard/item/block-link-propagation"
import type { StatDisplayMode } from "@/lib/types"
import type { StatItem } from "@/components/widgets"
import type { StatCardOrder } from "@/hooks/use-stat-card-order"
import { EyeOff } from "lucide-react"

interface EditableStatGridProps {
  items: StatItem[]
  cols?: number
  displayMode?: StatDisplayMode
  order: StatCardOrder | null
  onOrderChange: (order: StatCardOrder | null) => void
}

export function EditableStatGrid({
  items,
  cols,
  displayMode = "label",
  order,
  onOrderChange,
}: EditableStatGridProps) {
  const [activeId, setActiveId] = useState<string | null>(null)

  const sensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  })
  const sensors = useSensors(sensor)

  // Build active and unused item lists
  const { activeItems, unusedItems } = useMemo(() => {
    const itemMap = new Map(items.map((item) => [item.id, item]))

    if (!order) {
      return { activeItems: items, unusedItems: [] as StatItem[] }
    }

    const active = order.active
      .map((id) => itemMap.get(id))
      .filter((item): item is StatItem => item !== undefined)

    const unused = order.unused
      .map((id) => itemMap.get(id))
      .filter((item): item is StatItem => item !== undefined)

    return { activeItems: active, unusedItems: unused }
  }, [items, order])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)

      if (!over) return

      const activeIdStr = active.id as string
      const overIdStr = over.id as string

      // Find which lists contain the items
      const activeIds = new Set(activeItems.map((i: StatItem) => i.id))
      const unusedIds = new Set(unusedItems.map((i: StatItem) => i.id))

      const isFromActive = activeIds.has(activeIdStr)
      const isFromUnused = unusedIds.has(activeIdStr)
      const isOverActive = activeIds.has(overIdStr)
      const isOverUnused = overIdStr === "unused-zone"

      // Build new order
      let newActive = [...activeItems]
      let newUnused = [...unusedItems]

      if (isFromActive && isOverActive) {
        // Reorder within active list
        const oldIndex = newActive.findIndex((i) => i.id === activeIdStr)
        const newIndex = newActive.findIndex((i) => i.id === overIdStr)
        if (oldIndex !== -1 && newIndex !== -1) {
          const [moved] = newActive.splice(oldIndex, 1)
          newActive.splice(newIndex, 0, moved)
        }
      } else if (isFromActive && isOverUnused) {
        // Move from active to unused
        const item = newActive.find((i) => i.id === activeIdStr)
        if (item) {
          newActive = newActive.filter((i) => i.id !== activeIdStr)
          newUnused = [...newUnused, item]
        }
      } else if (isFromUnused && isOverActive) {
        // Move from unused to active (insert at position)
        const item = newUnused.find((i) => i.id === activeIdStr)
        if (item) {
          newUnused = newUnused.filter((i) => i.id !== activeIdStr)
          const overIndex = newActive.findIndex((i) => i.id === overIdStr)
          if (overIndex !== -1) {
            newActive.splice(overIndex, 0, item)
          } else {
            newActive = [...newActive, item]
          }
        }
      } else if (isFromUnused && isOverUnused) {
        // Reorder within unused list (no-op for now, just keep same order)
        return
      }

      onOrderChange({
        active: newActive.map((i) => i.id),
        unused: newUnused.map((i) => i.id),
      })
    },
    [activeItems, unusedItems, onOrderChange]
  )

  const handleDragStart = useCallback((event: DragStartEvent) => {
    setActiveId(event.active.id as string)
  }, [])

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: cols
      ? `repeat(${cols}, 1fr)`
      : "repeat(auto-fit, minmax(60px, 1fr))",
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-3">
        {/* Active items */}
        <SortableContext
          items={activeItems.map((i: StatItem) => i.id)}
          strategy={horizontalListSortingStrategy}
        >
          <div className="grid gap-1.5 text-xs" style={gridStyle}>
            {activeItems.map((item) => (
              <EditableStatCard
                key={item.id}
                item={item}
                displayMode={displayMode}
              />
            ))}
          </div>
        </SortableContext>

        {/* Unused drop zone */}
        <UnusedZone items={unusedItems} displayMode={displayMode} />
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {activeId ? (
          <div className="pointer-events-none">
            <StatCardOverlay
              item={[...activeItems, ...unusedItems].find(
                (i: StatItem) => i.id === activeId
              )}
              displayMode={displayMode}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}

interface EditableStatCardProps {
  item: StatItem
  displayMode: StatDisplayMode
}

function EditableStatCard({ item, displayMode }: EditableStatCardProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
  }

  const showIcon = displayMode === "icon" && item.icon
  const showLabel = displayMode === "label"
  const effectiveTooltip = showIcon ? (item.tooltip ?? item.label) : undefined

  const content = (
    <div
      ref={(el) => {
        setNodeRef(el)
        setActivatorNodeRef(el)
      }}
      style={style}
      {...attributes}
      {...listeners}
      aria-label="Drag to reorder stat card"
      data-testid="stat-card"
      className={cn(
        "flex h-full cursor-grab flex-col items-center justify-center rounded-md bg-secondary px-2 py-1.5 text-center text-secondary-foreground transition-all duration-200 select-none hover:scale-105 hover:bg-secondary/80 hover:shadow-md active:scale-95 active:cursor-grabbing",
        isDragging && "scale-110 rotate-3 opacity-50 shadow-lg"
      )}
    >
      <span
        className={cn(
          "font-medium tabular-nums",
          item.valueClassName ?? "text-secondary-foreground"
        )}
      >
        {item.value}
      </span>
      {showIcon && item.icon && (
        <div className="mt-0.5 text-secondary-foreground/50">
          <item.icon className="h-3 w-3" />
        </div>
      )}
      {showLabel ? (
        <span className="text-secondary-foreground/60">{item.label}</span>
      ) : !showIcon && effectiveTooltip ? (
        <span className="sr-only">{effectiveTooltip}</span>
      ) : null}
    </div>
  )

  if (effectiveTooltip) {
    return (
      <BlockLinkPropagation>
        <HoverCard>
          <HoverCardTrigger asChild>{content}</HoverCardTrigger>
          <HoverCardContent side="top" align="center" className="w-auto">
            {effectiveTooltip}
          </HoverCardContent>
        </HoverCard>
      </BlockLinkPropagation>
    )
  }

  return content
}

function UnusedZone({
  items,
  displayMode,
}: {
  items: StatItem[]
  displayMode: StatDisplayMode
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "unused-zone" })

  return (
    <div
      ref={setNodeRef}
      aria-label="Unused stat cards"
      className={cn(
        "rounded-lg border-2 border-dashed p-3 transition-colors",
        isOver
          ? "border-primary/50 bg-primary/5"
          : "border-border/50 bg-muted/30"
      )}
    >
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <EyeOff className="h-3.5 w-3.5" />
        <span>Unused ({items.length})</span>
      </div>
      {items.length > 0 ? (
        <div
          className="grid gap-1.5 text-xs"
          style={{
            gridTemplateColumns: "repeat(auto-fit, minmax(60px, 1fr))",
          }}
        >
          {items.map((item) => (
            <UnusedStatCard
              key={item.id}
              item={item}
              displayMode={displayMode}
            />
          ))}
        </div>
      ) : (
        <p className="text-center text-xs text-muted-foreground/60">
          Drop here to hide
        </p>
      )}
    </div>
  )
}

function UnusedStatCard({
  item,
  displayMode,
}: {
  item: StatItem
  displayMode: StatDisplayMode
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
  }

  const showIcon = displayMode === "icon" && item.icon
  const showLabel = displayMode === "label"
  const effectiveTooltip = showIcon ? (item.tooltip ?? item.label) : undefined

  const content = (
    <div
      ref={(el) => {
        setNodeRef(el)
        setActivatorNodeRef(el)
      }}
      style={style}
      {...attributes}
      {...listeners}
      aria-label="Drag to reorder stat card"
      data-testid="unused-stat-card"
      className={cn(
        "flex h-full cursor-grab flex-col items-center justify-center rounded-md bg-muted/50 px-2 py-1.5 text-center text-muted-foreground transition-all duration-200 select-none hover:bg-muted/70 active:scale-95 active:cursor-grabbing",
        isDragging && "scale-110 rotate-3 opacity-50 shadow-lg"
      )}
    >
      <span className="font-medium text-muted-foreground tabular-nums">
        {item.value}
      </span>
      {showIcon && item.icon && (
        <div className="mt-0.5 text-muted-foreground/50">
          <item.icon className="h-3 w-3" />
        </div>
      )}
      {showLabel ? (
        <span className="text-muted-foreground/60">{item.label}</span>
      ) : !showIcon && effectiveTooltip ? (
        <span className="sr-only">{effectiveTooltip}</span>
      ) : null}
    </div>
  )

  if (effectiveTooltip) {
    return (
      <BlockLinkPropagation>
        <HoverCard>
          <HoverCardTrigger asChild>{content}</HoverCardTrigger>
          <HoverCardContent side="top" align="center" className="w-auto">
            {effectiveTooltip}
          </HoverCardContent>
        </HoverCard>
      </BlockLinkPropagation>
    )
  }

  return content
}

function StatCardOverlay({
  item,
  displayMode,
}: {
  item: StatItem | undefined
  displayMode: StatDisplayMode
}) {
  if (!item) return null

  const showIcon = displayMode === "icon" && item.icon
  const showLabel = displayMode === "label"

  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center rounded-md bg-secondary px-2 py-1.5 text-center text-secondary-foreground shadow-lg",
        "scale-110 rotate-3"
      )}
    >
      <span
        className={cn(
          "font-medium tabular-nums",
          item.valueClassName ?? "text-secondary-foreground"
        )}
      >
        {item.value}
      </span>
      {showIcon && item.icon && (
        <div className="mt-0.5 text-secondary-foreground/50">
          <item.icon className="h-3 w-3" />
        </div>
      )}
      {showLabel ? (
        <span className="text-secondary-foreground/60">{item.label}</span>
      ) : null}
    </div>
  )
}
