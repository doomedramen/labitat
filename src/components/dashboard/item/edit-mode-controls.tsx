"use client"

import { useState } from "react"
import type { ItemRow } from "@/lib/types"
import { deleteItem } from "@/actions/items"
import { Pencil, Trash2, GripVertical } from "lucide-react"
import type { DraggableAttributes } from "@dnd-kit/core"
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities"
import { ConfirmDialog } from "@/components/confirm-dialog"

interface EditModeControlsProps {
  item: ItemRow
  onEdit: (item: ItemRow) => void
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
      <div className="absolute top-1 right-1 z-10 flex items-center gap-0.5 opacity-0 transition-opacity group-hover/item:opacity-100">
        <button
          ref={setActivatorNodeRef}
          {...attributes}
          {...listeners}
          className="cursor-grab rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-3.5 w-3.5" />
        </button>
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
          deleteItem(item.id)
          onDeleted?.(item.id)
          setDeleteConfirmOpen(false)
        }}
      />
    </>
  )
}
