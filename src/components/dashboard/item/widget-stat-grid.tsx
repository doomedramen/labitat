"use client"

/**
 * Wrapper around StatGrid that automatically consumes WidgetDisplayContext
 * and handles DnD reordering + active/unused management.
 * Adapters should use this instead of StatGrid directly.
 */

import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  DragOverlay,
} from "@dnd-kit/core"
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable"
import { useState } from "react"
import type { DragEndEvent, DragStartEvent } from "@dnd-kit/core"
import { StatCard, type StatItem } from "@/components/widgets"
import { useWidgetDisplay } from "@/components/dashboard/item/widget-display-context"
import { useStatCardOrder } from "@/hooks/use-stat-card-order"
import { cn } from "@/lib/utils"
import { Trash2, RotateCcw } from "lucide-react"

interface WidgetStatGridProps {
  items: StatItem[]
  cols?: number
}

export function WidgetStatGrid({ items, cols }: WidgetStatGridProps) {
  const displaySettings = useWidgetDisplay()

  // Hooks must be called unconditionally
  const { activeItems, unusedItems, handleReorder, moveBetweenLists } =
    useStatCardOrder(
      displaySettings?.itemId ?? "",
      items,
      displaySettings?.statCardOrder ?? null
    )

  const [activeDragId, setActiveDragId] = useState<string | null>(null)

  const sensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  })
  const sensors = useSensors(sensor)

  const handleDragStart = (event: DragStartEvent) => {
    setActiveDragId(event.active.id as string)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    setActiveDragId(null)

    const { active, over } = event
    if (!over || !displaySettings) return

    const activeId = active.id as string
    const overId = over.id as string

    // Determine source and target containers
    const activeInActive = activeItems.find((i) => i.id === activeId)
    const activeInUnused = unusedItems.find((i) => i.id === activeId)
    const overInActive = activeItems.find((i) => i.id === overId)
    const overInUnused = unusedItems.find((i) => i.id === overId)

    if (activeInActive && overInUnused) {
      // Active → Unused
      moveBetweenLists(activeId, "active", activeItems, unusedItems)
    } else if (activeInUnused && overInActive) {
      // Unused → Active
      moveBetweenLists(activeId, "unused", activeItems, unusedItems)
    } else if (activeInActive && overInActive) {
      // Reorder within active
      const activeIds = activeItems.map((i) => i.id)
      const activeIndex = activeIds.indexOf(activeId)
      const overIndex = activeIds.indexOf(overId)
      if (activeIndex !== overIndex) {
        const newActive = [...activeItems]
        const [moved] = newActive.splice(activeIndex, 1)
        newActive.splice(overIndex, 0, moved)
        handleReorder(newActive, unusedItems)
      }
    } else if (activeInUnused && overInUnused) {
      // Reorder within unused
      const unusedIds = unusedItems.map((i) => i.id)
      const activeIndex = unusedIds.indexOf(activeId)
      const overIndex = unusedIds.indexOf(overId)
      if (activeIndex !== overIndex) {
        const newUnused = [...unusedItems]
        const [moved] = newUnused.splice(activeIndex, 1)
        newUnused.splice(overIndex, 0, moved)
        handleReorder(activeItems, newUnused)
      }
    }
  }

  const draggedItem = [...activeItems, ...unusedItems].find(
    (i) => i.id === activeDragId
  )

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={handleDragStart}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-2">
        {/* Active stat cards */}
        <SortableContext
          items={activeItems.map((i) => i.id)}
          strategy={rectSortingStrategy}
        >
          <div
            className="grid gap-1.5 text-xs"
            style={{
              gridTemplateColumns: cols
                ? `repeat(${cols}, 1fr)`
                : "repeat(auto-fit, minmax(60px, 1fr))",
            }}
          >
            {activeItems.map((item) => (
              <StatCard
                key={item.id}
                {...item}
                displayMode={statDisplayMode}
                sortable={editMode}
                editMode={editMode}
              />
            ))}
          </div>
        </SortableContext>

        {/* Unused stat cards drop zone (edit mode only) */}
        {editMode && (
          <div
            className={cn(
              "rounded-lg border-2 border-dashed p-3 transition-colors",
              unusedItems.length > 0
                ? "border-muted-foreground/30"
                : "border-muted-foreground/15"
            )}
          >
            <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
              <Trash2 className="h-3 w-3" />
              <span>Unused stat cards</span>
              {unusedItems.length > 0 && (
                <span className="ml-auto text-[10px]">
                  Drag back to restore
                </span>
              )}
            </div>
            {unusedItems.length > 0 ? (
              <SortableContext
                items={unusedItems.map((i) => i.id)}
                strategy={rectSortingStrategy}
              >
                <div className="grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-1.5">
                  {unusedItems.map((item) => (
                    <div
                      key={item.id}
                      className="relative rounded-md bg-muted/50 opacity-60"
                    >
                      <StatCard
                        {...item}
                        displayMode={statDisplayMode}
                        sortable={editMode}
                        editMode={editMode}
                      />
                      <div className="absolute inset-0 flex items-center justify-center">
                        <RotateCcw className="h-3 w-3 text-muted-foreground/50" />
                      </div>
                    </div>
                  ))}
                </div>
              </SortableContext>
            ) : (
              <p className="text-center text-[11px] text-muted-foreground/50">
                Drag stat cards here to hide them
              </p>
            )}
          </div>
        )}
      </div>

      {/* Drag overlay */}
      <DragOverlay>
        {draggedItem ? (
          <div className="rounded-md bg-popover/90 shadow-lg ring-2 ring-ring backdrop-blur-sm">
            <StatCard
              {...draggedItem}
              displayMode={statDisplayMode}
              sortable={false}
              editMode={false}
            />
          </div>
        ) : null}
      </DragOverlay>
    </DndContext>
  )
}
