"use client";

/**
 * Client-only StatGrid component.
 * Wraps StatCards in a DnD context when sortable+editMode are enabled.
 */

import { DndContext, closestCenter, PointerSensor, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, horizontalListSortingStrategy } from "@dnd-kit/sortable";
import type { DragEndEvent } from "@dnd-kit/core";
import { StatCard } from "./stat-card";
import type { StatItem } from "./types";
import type { StatDisplayMode } from "@/lib/types";

interface StatGridProps {
  items: StatItem[];
  cols?: number;
  displayMode?: StatDisplayMode;
  sortable?: boolean;
  editMode?: boolean;
  onReorder?: (activeId: string, overId: string) => void;
}

export function StatGrid({
  items,
  cols,
  displayMode = "label",
  sortable = false,
  editMode = false,
  onReorder,
}: StatGridProps) {
  const dndEnabled = sortable && editMode && items.length > 1;

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

  if (items.length === 0) return null;

  const inner = (
    <div
      className="grid gap-1.5 text-xs"
      style={{
        gridTemplateColumns: cols ? `repeat(${cols}, 1fr)` : "repeat(auto-fit, minmax(60px, 1fr))",
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
  );

  if (dndEnabled) {
    return (
      <DndContext sensors={sensors} collisionDetection={closestCenter} onDragEnd={handleDragEnd}>
        <SortableContext items={items.map((i) => i.id)} strategy={horizontalListSortingStrategy}>
          {inner}
        </SortableContext>
      </DndContext>
    );
  }

  return inner;
}
