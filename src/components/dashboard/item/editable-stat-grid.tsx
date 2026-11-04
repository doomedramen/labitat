"use client";

import { useMemo, useState } from "react";
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  pointerWithin,
  useDroppable,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core";
import { SortableContext, rectSortingStrategy, useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowLeft, ArrowRight, EyeOff, GripVertical, Plus } from "lucide-react";
import { cn } from "@/lib/utils";
import { resolveStatCardLayout, type StatCardOrder } from "@/lib/stat-card-layout";
import type { StatItem } from "@/components/widgets";
import type { StatDisplayMode } from "@/lib/types";

interface EditableStatGridProps {
  items: StatItem[];
  displayMode?: StatDisplayMode;
  order: StatCardOrder | null;
  onOrderChange: (order: StatCardOrder | null) => void;
  defaultActiveIds?: string[];
}

export function EditableStatGrid({
  items,
  order,
  onOrderChange,
  defaultActiveIds,
}: EditableStatGridProps) {
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const sensors = useSensors(useSensor(PointerSensor, { activationConstraint: { distance: 8 } }));
  const { activeItems, unusedItems } = useMemo(
    () => resolveStatCardLayout(items, order, defaultActiveIds),
    [items, order, defaultActiveIds],
  );
  const activeIds = activeItems.map((item) => item.id);
  const unusedIds = unusedItems.map((item) => item.id);

  function change(active: string[], unused: string[]) {
    onOrderChange({ active, unused });
  }
  function toggle(id: string) {
    if (activeIds.includes(id))
      change(
        activeIds.filter((value) => value !== id),
        [...unusedIds, id],
      );
    else
      change(
        [...activeIds, id],
        unusedIds.filter((value) => value !== id),
      );
  }
  function move(id: string, direction: number) {
    const next = [...activeIds];
    const index = next.indexOf(id);
    const target = index + direction;
    if (index < 0 || target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    change(next, unusedIds);
  }
  function drop({ active, over }: DragEndEvent) {
    setDraggedId(null);
    if (!over || active.id === over.id) return;
    const id = String(active.id);
    const target = String(over.id);
    const fromActive = activeIds.includes(id);
    if (target === "unused-zone" || unusedIds.includes(target)) {
      if (fromActive) toggle(id);
      return;
    }
    if (target !== "active-zone" && !activeIds.includes(target)) return;
    const next = activeIds.filter((value) => value !== id);
    const index = target === "active-zone" ? next.length : activeIds.indexOf(target);
    next.splice(index, 0, id);
    change(
      next,
      unusedIds.filter((value) => value !== id),
    );
  }
  const dragged = items.find((item) => item.id === draggedId);
  return (
    <DndContext
      sensors={sensors}
      collisionDetection={(args) => {
        const collisions = pointerWithin(args);
        const cards = collisions.filter(({ id }) => id !== "active-zone" && id !== "unused-zone");
        return cards.length ? cards : collisions;
      }}
      onDragStart={({ active }) => setDraggedId(String(active.id))}
      onDragEnd={drop}
      onDragCancel={() => setDraggedId(null)}
    >
      <div className="space-y-3">
        <MetricZone id="active-zone" label={`Shown (${activeItems.length})`}>
          <SortableContext items={activeIds} strategy={rectSortingStrategy}>
            <div className="grid gap-2 sm:grid-cols-2">
              {activeItems.map((item, index) => (
                <Metric
                  key={item.id}
                  item={item}
                  active
                  onToggle={() => toggle(item.id)}
                  onMove={(direction) => move(item.id, direction)}
                  first={index === 0}
                  last={index === activeItems.length - 1}
                />
              ))}
            </div>
          </SortableContext>
          {!activeItems.length && (
            <p className="py-3 text-xs text-muted-foreground">
              Drop metrics here, or select Show below.
            </p>
          )}
        </MetricZone>
        <MetricZone id="unused-zone" label={`Unused (${unusedItems.length})`}>
          <SortableContext items={unusedIds} strategy={rectSortingStrategy}>
            <div className="grid gap-2 sm:grid-cols-2">
              {unusedItems.map((item) => (
                <Metric key={item.id} item={item} active={false} onToggle={() => toggle(item.id)} />
              ))}
            </div>
          </SortableContext>
          {!unusedItems.length && (
            <p className="py-3 text-xs text-muted-foreground">Drop here to hide.</p>
          )}
        </MetricZone>
        <button
          type="button"
          className="text-xs text-muted-foreground underline underline-offset-4"
          onClick={() => onOrderChange(null)}
        >
          Reset to defaults (up to 4)
        </button>
      </div>
      <DragOverlay dropAnimation={null}>
        {dragged && (
          <div className="rounded-md border bg-popover p-3 text-sm shadow-md">{dragged.label}</div>
        )}
      </DragOverlay>
    </DndContext>
  );
}

function MetricZone({
  id,
  label,
  children,
}: {
  id: string;
  label: string;
  children: React.ReactNode;
}) {
  const { setNodeRef, isOver } = useDroppable({ id });
  return (
    <section
      ref={setNodeRef}
      aria-label={id === "active-zone" ? "Shown stat cards" : "Unused stat cards"}
      className={cn(
        "rounded-lg border border-dashed p-3",
        isOver ? "border-primary bg-accent" : "border-border",
      )}
    >
      <h4 className="mb-2 text-xs font-medium text-muted-foreground">{label}</h4>
      {children}
    </section>
  );
}

function Metric({
  item,
  active,
  onToggle,
  onMove,
  first,
  last,
}: {
  item: StatItem;
  active: boolean;
  onToggle: () => void;
  onMove?: (direction: number) => void;
  first?: boolean;
  last?: boolean;
}) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id: item.id });
  const actionClass =
    "grid size-8 shrink-0 place-items-center rounded text-muted-foreground hover:bg-accent hover:text-foreground focus-visible:outline-2 focus-visible:outline-ring disabled:opacity-30";
  return (
    <div
      ref={setNodeRef}
      style={{
        transform: CSS.Translate.toString(transform),
        transition,
        opacity: isDragging ? 0.4 : 1,
      }}
      data-testid={active ? "stat-card" : "unused-stat-card"}
      className="flex min-w-0 items-center gap-1 rounded-md bg-muted p-1 text-xs"
    >
      <button
        ref={setActivatorNodeRef}
        type="button"
        {...attributes}
        {...listeners}
        aria-label={`Drag ${item.label}`}
        className={cn(actionClass, "cursor-grab touch-none")}
      >
        <GripVertical size={14} />
      </button>
      <span className="min-w-0 flex-1 break-words">{item.label}</span>
      {active && (
        <>
          <button
            type="button"
            className={actionClass}
            disabled={first}
            onClick={() => onMove?.(-1)}
            aria-label={`Move ${item.label} earlier`}
          >
            <ArrowLeft size={14} />
          </button>
          <button
            type="button"
            className={actionClass}
            disabled={last}
            onClick={() => onMove?.(1)}
            aria-label={`Move ${item.label} later`}
          >
            <ArrowRight size={14} />
          </button>
        </>
      )}
      <button
        type="button"
        className={actionClass}
        onClick={onToggle}
        aria-label={`${active ? "Hide" : "Show"} ${item.label}`}
        title={active ? "Hide" : "Show"}
      >
        {active ? <EyeOff size={14} /> : <Plus size={14} />}
      </button>
    </div>
  );
}
