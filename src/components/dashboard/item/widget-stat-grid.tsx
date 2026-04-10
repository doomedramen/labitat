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
  useDroppable,
} from "@dnd-kit/core"
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable"
import type { DragEndEvent } from "@dnd-kit/core"
import { StatCard, type StatItem } from "@/components/widgets"
import { useWidgetDisplay } from "@/components/dashboard/item/widget-display-context"
import { useStatCardOrder } from "@/hooks/use-stat-card-order"
import { cn } from "@/lib/utils"
import { Trash2 } from "lucide-react"

interface WidgetStatGridProps {
  items: StatItem[]
  cols?: number
}

// ── Droppable zone wrappers ────────────────────────────────────────────────────
// Must be separate components so useDroppable runs inside the DndContext subtree.

function ActiveZone({
  items,
  statDisplayMode,
  gridStyle,
}: {
  items: StatItem[]
  statDisplayMode: "icon" | "label"
  gridStyle: React.CSSProperties
}) {
  const { setNodeRef } = useDroppable({ id: "active-zone" })
  return (
    <SortableContext
      items={items.map((i) => i.id)}
      strategy={rectSortingStrategy}
    >
      <div ref={setNodeRef} className="grid gap-1.5 text-xs" style={gridStyle}>
        {items.map((item) => (
          <StatCard
            key={item.id}
            {...item}
            displayMode={statDisplayMode}
            sortable
            editMode
          />
        ))}
      </div>
    </SortableContext>
  )
}

function UnusedZone({
  items,
  statDisplayMode,
}: {
  items: StatItem[]
  statDisplayMode: "icon" | "label"
}) {
  const { setNodeRef, isOver } = useDroppable({ id: "unused-zone" })
  return (
    <div
      ref={setNodeRef}
      className={cn(
        "rounded-lg border-2 border-dashed p-3 transition-colors",
        isOver
          ? "border-primary/50 bg-primary/5"
          : items.length > 0
            ? "border-muted-foreground/30"
            : "border-muted-foreground/15"
      )}
    >
      <div className="mb-2 flex items-center gap-1.5 text-xs text-muted-foreground">
        <Trash2 className="h-3 w-3" />
        <span>Unused stat cards</span>
        {items.length > 0 && (
          <span className="ml-auto text-[10px]">Drag back to restore</span>
        )}
      </div>
      {items.length > 0 ? (
        <SortableContext
          items={items.map((i) => i.id)}
          strategy={rectSortingStrategy}
        >
          <div className="grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-1.5">
            {items.map((item) => (
              <div key={item.id} className="opacity-50">
                <StatCard
                  {...item}
                  displayMode={statDisplayMode}
                  sortable
                  editMode
                />
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
  )
}

// ── Main component ─────────────────────────────────────────────────────────────

export function WidgetStatGrid({ items, cols }: WidgetStatGridProps) {
  const displaySettings = useWidgetDisplay()

  // Hooks must be called unconditionally
  const { activeItems, unusedItems, handleReorder, moveBetweenLists } =
    useStatCardOrder(
      displaySettings?.itemId ?? "",
      items,
      displaySettings?.statCardOrder ?? null,
      displaySettings?.defaultActiveIds
    )

  const sensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  })
  const sensors = useSensors(sensor)

  const { statDisplayMode, editMode } = displaySettings ?? {
    statDisplayMode: "label" as const,
    editMode: false,
  }

  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: cols
      ? `repeat(${cols}, 1fr)`
      : "repeat(auto-fit, minmax(60px, 1fr))",
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    if (!over || !displaySettings) return

    const activeId = active.id as string
    const overId = over.id as string

    const activeInActive = activeItems.find((i) => i.id === activeId)
    const activeInUnused = unusedItems.find((i) => i.id === activeId)
    const overInActive =
      !!activeItems.find((i) => i.id === overId) || overId === "active-zone"
    const overInUnused =
      !!unusedItems.find((i) => i.id === overId) || overId === "unused-zone"

    if (activeInActive && overInUnused) {
      // Active → Unused
      const newActive = activeItems.filter((i) => i.id !== activeId)
      const newUnused = [...unusedItems, activeInActive]
      moveBetweenLists(activeId, "active", activeItems, unusedItems)
      displaySettings.onOrderChange?.({
        active: newActive.map((i) => i.id),
        unused: newUnused.map((i) => i.id),
      })
    } else if (activeInUnused && overInActive) {
      // Unused → Active
      const newUnused = unusedItems.filter((i) => i.id !== activeId)
      const newActive = [...activeItems, activeInUnused]
      moveBetweenLists(activeId, "unused", activeItems, unusedItems)
      displaySettings.onOrderChange?.({
        active: newActive.map((i) => i.id),
        unused: newUnused.map((i) => i.id),
      })
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
        displaySettings.onOrderChange?.({
          active: newActive.map((i) => i.id),
          unused: unusedItems.map((i) => i.id),
        })
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
        displaySettings.onOrderChange?.({
          active: activeItems.map((i) => i.id),
          unused: newUnused.map((i) => i.id),
        })
      }
    }
  }

  // Non-edit mode: simple grid, no DnD (avoids nested DndContext on dashboard)
  if (!editMode) {
    return (
      <div className="grid gap-1.5 text-xs" style={gridStyle}>
        {activeItems.map((item) => (
          <StatCard key={item.id} {...item} displayMode={statDisplayMode} />
        ))}
      </div>
    )
  }

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragEnd={handleDragEnd}
    >
      <div className="space-y-2">
        <ActiveZone
          items={activeItems}
          statDisplayMode={statDisplayMode}
          gridStyle={gridStyle}
        />
        <UnusedZone items={unusedItems} statDisplayMode={statDisplayMode} />
      </div>
    </DndContext>
  )
}
