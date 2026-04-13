"use client"

/**
 * Simplified ItemCard for edit mode.
 * Shows title, adapter name, and href — no stat cards or status dots.
 * Adds drag handle and edit/delete buttons.
 */

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { getService } from "@/lib/adapters"
import type { ItemWithCache } from "@/lib/types"
import { Pencil, Trash2, GripVertical } from "lucide-react"
import { useState } from "react"
import { ConfirmDialog } from "@/components/confirm-dialog"

interface ItemCardDummyProps {
  item: ItemWithCache
  editMode: boolean
  onEdit: (item: ItemWithCache) => void
  onDeleted: (itemId: string) => void
}

export function ItemCardDummy({
  item,
  editMode,
  onEdit,
  onDeleted,
}: ItemCardDummyProps) {
  const serviceDef = item.serviceType ? getService(item.serviceType) : null
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { type: "item" },
    disabled: !editMode,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
  }

  return (
    <>
      <div
        ref={setNodeRef}
        style={style}
        className={cn(
          "group/item relative overflow-hidden rounded-xl border-2 border-ring/50 bg-card",
          isDragging && "rotate-2 shadow-2xl ring-2 ring-ring/20"
        )}
        data-testid="item-card"
        data-item-id={item.id}
      >
        {/* Drag handle */}
        <button
          {...attributes}
          {...listeners}
          className="absolute top-2 left-2 cursor-grab text-muted-foreground/50 transition-all duration-200 hover:scale-110 hover:text-muted-foreground active:scale-95 active:cursor-grabbing"
          aria-label="Drag to reorder"
        >
          <GripVertical className="h-4 w-4" />
        </button>

        {/* Edit/Delete buttons */}
        <div className="absolute top-2 right-2 flex items-center gap-1">
          <button
            onClick={() => onEdit(item)}
            className="rounded p-1 text-muted-foreground transition-all duration-200 hover:scale-110 hover:bg-secondary hover:text-foreground active:scale-95"
            aria-label="Edit item"
          >
            <Pencil className="h-4 w-4" />
          </button>
          <button
            onClick={() => setDeleteConfirmOpen(true)}
            className="rounded p-1 text-muted-foreground transition-all duration-200 hover:scale-110 hover:bg-destructive/10 hover:text-destructive active:scale-95"
            aria-label="Delete item"
          >
            <Trash2 className="h-4 w-4" />
          </button>
        </div>

        {/* Content */}
        <div className="px-3 pt-8 pb-3">
          <p className="truncate text-sm font-medium">{item.label}</p>
          <div className="mt-1 flex flex-col text-xs text-muted-foreground">
            {serviceDef && <span>{serviceDef.name}</span>}
            {item.href && <span className="truncate">{item.href}</span>}
            <span>
              {(item.pollingMs ?? serviceDef?.defaultPollingMs ?? 30_000) /
                1000}
              s poll
            </span>
          </div>
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete item"
        description={`Are you sure you want to delete "${item.label}"? This cannot be undone.`}
        onConfirm={() => {
          onDeleted(item.id)
          setDeleteConfirmOpen(false)
        }}
      />
    </>
  )
}
