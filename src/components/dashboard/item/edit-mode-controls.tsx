"use client"

import { useState } from "react"
import type { ItemWithCache } from "@/lib/types"
import { Pencil, Trash2, GripHorizontal } from "lucide-react"
import type { DraggableAttributes } from "@dnd-kit/core"
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities"
import { ConfirmDialog } from "@/components/confirm-dialog"

interface EditModeControlsProps {
  item: ItemWithCache
  onEdit: (item: ItemWithCache) => void
  onDeleted?: (itemId: string) => void
  setActivatorNodeRef: (element: HTMLElement | null) => void
  attributes: DraggableAttributes
  listeners: SyntheticListenerMap | undefined
}

export function EditModeControls({
  item,
  onEdit,
  onDeleted,
  setActivatorNodeRef,
  attributes,
  listeners,
}: EditModeControlsProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  return (
    <>
      {/* Drag handle — full-width top bar, always visible in edit mode */}
      <div
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="absolute inset-x-0 top-0 flex h-5 cursor-grab items-center justify-center text-muted-foreground/40 hover:text-muted-foreground/70 active:cursor-grabbing"
        aria-label="Drag to reorder"
      >
        <GripHorizontal className="h-3 w-5" />
      </div>

      {/* Edit / delete — top-right, show on hover */}
      <div className="absolute top-5 right-1 z-10 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/item:opacity-100">
        <button
          onClick={() => onEdit(item)}
          className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
          aria-label="Edit item"
        >
          <Pencil className="h-3.5 w-3.5" />
        </button>
        <button
          onClick={() => setDeleteConfirmOpen(true)}
          className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
          aria-label="Delete item"
        >
          <Trash2 className="h-3.5 w-3.5" />
        </button>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete item"
        description={`Are you sure you want to delete "${item.label}"? This cannot be undone.`}
        onConfirm={() => {
          onDeleted?.(item.id)
          setDeleteConfirmOpen(false)
        }}
      />
    </>
  )
}
