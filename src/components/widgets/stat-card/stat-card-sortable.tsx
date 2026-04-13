"use client";

/**
 * Client-only StatCardSortable wrapper.
 * Adds dnd-kit drag-and-drop functionality for edit mode.
 */

import { useCallback } from "react";
import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { HoverCard, HoverCardTrigger, HoverCardContent } from "@/components/ui/hover-card";
import { BlockLinkPropagation } from "@/components/dashboard/item/block-link-propagation";
import type { StatCardProps } from "./types";

interface StatCardSortableProps extends StatCardProps {
  sortable: true;
  editMode: true;
}

export function StatCardSortable({
  id,
  value,
  label,
  icon,
  tooltip,
  valueClassName,
  displayMode,
}: StatCardSortableProps) {
  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({ id, disabled: false });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
  };

  const showIcon = displayMode === "icon" && icon;
  const showLabel = displayMode === "label";
  const effectiveTooltip = showIcon ? (tooltip ?? label) : undefined;

  const combinedRef = useCallback(
    (el: HTMLDivElement | null) => {
      setNodeRef(el);
      setActivatorNodeRef(el);
    },
    [setNodeRef, setActivatorNodeRef],
  );

  const inner = (
    <div
      ref={combinedRef}
      style={style}
      {...attributes}
      {...listeners}
      className={cn(
        "flex h-full cursor-grab flex-col items-center justify-center rounded-md bg-secondary px-2 py-1.5 text-center text-secondary-foreground transition-all duration-200 select-none hover:scale-105 hover:bg-secondary/80 hover:shadow-md active:scale-95 active:cursor-grabbing",
        isDragging && "scale-110 rotate-3 opacity-50 shadow-lg",
      )}
    >
      <span
        className={cn("font-medium tabular-nums", valueClassName ?? "text-secondary-foreground")}
      >
        {value}
      </span>
      {showIcon && icon && (
        <div className="mt-0.5 text-secondary-foreground/50">
          {(() => {
            const Icon = icon;
            return <Icon className="h-3 w-3" />;
          })()}
        </div>
      )}
      {showLabel ? (
        <span className="text-secondary-foreground/60">{label}</span>
      ) : !showIcon && effectiveTooltip ? (
        <span className="sr-only">{effectiveTooltip}</span>
      ) : null}
    </div>
  );

  if (effectiveTooltip) {
    return (
      <BlockLinkPropagation>
        <HoverCard>
          <HoverCardTrigger asChild>{inner}</HoverCardTrigger>
          <HoverCardContent side="top" align="center" className="w-auto">
            {effectiveTooltip}
          </HoverCardContent>
        </HoverCard>
      </BlockLinkPropagation>
    );
  }
  return inner;
}
