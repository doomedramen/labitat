"use client";

/**
 * Client-only StatGrid wrapper.
 * Adds dnd-kit drag-and-drop for reordering stat cards.
 * Adapts layout based on item count.
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

function getGridClasses(count: number): string {
  switch (count) {
    case 1:
      return "grid-cols-1";
    case 2:
      return "grid-cols-2";
    case 3:
      return "grid-cols-3";
    case 4:
    default:
      return "grid-cols-2 sm:grid-cols-4";
  }
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
        <div className={cn("grid gap-1.5 text-xs", getGridClasses(items.length))}>
          {items.map((item) => (
            <StatCard key={item.id} {...item} displayMode={displayMode} sortable editMode />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
