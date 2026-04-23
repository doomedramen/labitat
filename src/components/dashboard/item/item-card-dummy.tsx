"use client";

/**
 * Simplified ItemCard for edit mode.
 * Shows title, adapter name, and href — no stat cards or status dots.
 * Adds drag handle and edit/delete buttons.
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { cn } from "@/lib/utils";
import { getService } from "@/lib/adapters";
import type { ItemWithCache } from "@/lib/types";
import { Pencil, Trash2, GripVertical, ExternalLink } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { ItemIcon } from "./item-icon";

interface ItemCardDummyProps {
  item: ItemWithCache;
  editMode: boolean;
  onEdit: (item: ItemWithCache) => void;
  onDeleted: (itemId: string) => void;
}

export function ItemCardDummy({ item, editMode, onEdit, onDeleted }: ItemCardDummyProps) {
  const serviceDef = item.serviceType ? getService(item.serviceType) : null;
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: item.id,
    data: { type: "item" },
    disabled: !editMode,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.4 : undefined,
  };

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          // Base container
          "group/item-dummy relative flex flex-col",
          "rounded-xl overflow-hidden",
          // Background with subtle gradient
          "bg-gradient-to-b from-card to-card/95",
          // Border
          "border-2 border-ring/40",
          // Dragging state
          isDragging && [
            "rotate-1 scale-[1.02]",
            "shadow-[0_20px_40px_-12px_rgba(0,0,0,0.3)]",
            "ring-2 ring-ring/30",
          ],
          // Transition
          "transition-all duration-200 ease-out",
        )}
        data-testid="item-card"
        data-item-id={item.id}
        data-stat-card-order={
          item.statCardOrder === null || item.statCardOrder === undefined
            ? ""
            : typeof item.statCardOrder === "string"
              ? item.statCardOrder
              : JSON.stringify(item.statCardOrder)
        }
      >
        {/* Top action bar */}
        <div
          className={cn(
            "flex items-center justify-between px-3 py-2",
            "bg-gradient-to-r from-muted/50 via-muted/30 to-muted/50",
            "border-b border-border/30",
          )}
        >
          {/* Drag handle */}
          <button
            {...attributes}
            {...listeners}
            className={cn(
              "flex items-center gap-1.5",
              "text-muted-foreground/50",
              "transition-all duration-200",
              "hover:text-muted-foreground hover:scale-105",
              "active:scale-95 active:cursor-grabbing",
              "cursor-grab",
            )}
            aria-label="Drag to reorder"
          >
            <GripVertical className="h-4 w-4" />
            <span className="text-[10px] font-medium uppercase tracking-wider">Move</span>
          </button>

          {/* Edit/Delete buttons */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => onEdit(item)}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-1",
                "text-muted-foreground",
                "transition-all duration-200",
                "hover:bg-secondary hover:text-foreground hover:scale-105",
                "active:scale-95",
              )}
              aria-label="Edit item"
            >
              <Pencil className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">Edit</span>
            </button>
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className={cn(
                "flex items-center gap-1 rounded-lg px-2 py-1",
                "text-muted-foreground",
                "transition-all duration-200",
                "hover:bg-destructive/10 hover:text-destructive hover:scale-105",
                "active:scale-95",
              )}
              aria-label="Delete item"
            >
              <Trash2 className="h-3.5 w-3.5" />
              <span className="text-[10px] font-medium">Delete</span>
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="flex items-center gap-3.5 px-3 py-3.5">
          <div className="shrink-0">
            <ItemIcon
              iconUrl={item.iconUrl}
              label={item.label}
              serviceIcon={serviceDef?.icon ?? null}
            />
          </div>
          <div className="min-w-0 flex-1">
            {/* Title */}
            <p className="truncate text-sm font-semibold text-card-foreground">{item.label}</p>

            {/* Metadata */}
            <div className="mt-1 flex flex-col gap-0.5">
              {serviceDef && (
                <span className="inline-flex items-center gap-1.5 text-xs font-medium text-primary/80">
                  <span className="inline-block h-1.5 w-1.5 rounded-full bg-primary/60" />
                  {serviceDef.name}
                </span>
              )}
              {item.href && (
                <span className="flex items-center gap-1.5 truncate text-xs text-muted-foreground/70">
                  <ExternalLink className="h-3 w-3 shrink-0" />
                  {item.href}
                </span>
              )}
              <span className="inline-flex items-center gap-1.5 text-[11px] text-muted-foreground/60">
                <span className="inline-block h-1.5 w-1.5 rounded-full bg-muted-foreground/40" />
                {(item.pollingMs ?? serviceDef?.defaultPollingMs ?? 30_000) / 1000}s refresh
              </span>
            </div>
          </div>
        </div>

        {/* Subtle gradient overlay on hover */}
        <div
          className={cn(
            "pointer-events-none absolute inset-0 opacity-0",
            "bg-gradient-to-b from-primary/[0.02] to-transparent",
            "transition-opacity duration-300",
            "group-hover/item-dummy:opacity-100",
          )}
        />
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete item"
        description={`Are you sure you want to delete "${item.label}"? This cannot be undone.`}
        onConfirm={() => {
          onDeleted(item.id);
          setDeleteConfirmOpen(false);
        }}
      />
    </>
  );
}
