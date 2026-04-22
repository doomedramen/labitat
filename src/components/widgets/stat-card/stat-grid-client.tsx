"use client";

/**
 * Client-only StatGrid wrapper.
 * Adds dnd-kit drag-and-drop for reordering stat cards.
 * Enforces 2x2 or 4-per-row layout to prevent orphans.
 */

import { cn } from "@/lib/utils";
import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { StatCard } from "./stat-card";
import type { StatItem } from "./types";
import type { StatDisplayMode } from "@/lib/types";

interface StatGridClientProps {
  items: StatItem[];
  displayMode?: StatDisplayMode;
  onReorder?: (activeId: string, overId: string) => void;
}

export function StatGridClient({ items, displayMode = "label", onReorder }: StatGridClientProps) {
  const sensor = useSensor(PointerSensor, {
    activationConstraint: { distance: 8 },
  });
  const sensors = useSensors(sensor);

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event;
    if (!over || !onReorder) return;
    if (active.id !== over.id) {
      onReorder(active.id as string, over.id as string);
    }
  };

  return (
    <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
      <SortableContext items={items.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
        <div
          className={cn(
            "grid gap-1.5 text-xs",
            // Mobile: 2 columns, Desktop: 4 columns
            "grid-cols-2 sm:grid-cols-4",
          )}
        >
          {items.map((item) => (
            <StatCard key={item.id} {...item} displayMode={displayMode} sortable editMode />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
