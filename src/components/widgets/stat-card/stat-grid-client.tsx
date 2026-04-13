"use client";

/**
 * Client-only StatGrid wrapper.
 * Adds dnd-kit drag-and-drop for reordering stat cards.
 */

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { StatCard } from "./stat-card";
import type { StatItem } from "./types";
import type { StatDisplayMode } from "@/lib/types";

interface StatGridClientProps {
  items: StatItem[];
  cols?: number;
  displayMode?: StatDisplayMode;
  onReorder?: (activeId: string, overId: string) => void;
}

export function StatGridClient({
  items,
  cols,
  displayMode = "label",
  onReorder,
}: StatGridClientProps) {
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
          className="grid gap-1.5 text-xs"
          style={{
            gridTemplateColumns: cols
              ? `repeat(${cols}, 1fr)`
              : "repeat(auto-fit, minmax(60px, 1fr))",
          }}
        >
          {items.map((item) => (
            <StatCard key={item.id} {...item} displayMode={displayMode} sortable editMode />
          ))}
        </div>
      </SortableContext>
    </DndContext>
  );
}
