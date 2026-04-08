"use client"

import { useTransition } from "react"
import { GripVerticalIcon, PencilIcon, Trash2Icon } from "lucide-react"
import type { DraggableAttributes } from "@dnd-kit/core/dist/hooks/useDraggable"
import type { SyntheticListenerMap } from "@dnd-kit/core/dist/hooks/utilities"
import { Button } from "@/components/ui/button"
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"
import { deleteItem } from "@/actions/items"
import type { ItemRow } from "@/lib/types"

// ── EditModeControls component ────────────────────────────────────────────────

interface EditModeControlsProps {
  item: ItemRow
  onEdit: (item: ItemRow) => void
  onDeleted?: (itemId: string) => void
  setActivatorNodeRef: (element: HTMLElement | null) => void
  attributes: DraggableAttributes
  listeners?: SyntheticListenerMap
}

export function EditModeControls({
  item,
  onEdit,
  onDeleted,
  setActivatorNodeRef,
  attributes,
  listeners,
}: EditModeControlsProps) {
  const [isPending, startTransition] = useTransition()

  const handleDelete = () => {
    onDeleted?.(item.id)
    startTransition(() => deleteItem(item.id))
  }

  return (
    <div className="pointer-events-none absolute inset-0 flex items-start justify-end gap-0.5 p-1 opacity-0 transition-opacity group-hover/item:opacity-100">
      {/* Drag handle */}
      <button
        ref={setActivatorNodeRef}
        {...attributes}
        {...listeners}
        className="flex-none cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
        aria-label="Drag to reorder item"
      >
        <GripVerticalIcon className="size-4" />
      </button>

      {/* Edit button */}
      <Button
        size="icon-xs"
        variant="ghost"
        className="pointer-events-auto bg-popover/80"
        onClick={() => onEdit(item)}
        data-testid="item-edit-button"
      >
        <PencilIcon />
        <span className="sr-only">Edit {item.label}</span>
      </Button>

      {/* Delete button with confirmation */}
      <AlertDialog>
        <AlertDialogTrigger
          render={
            <Button
              size="icon-xs"
              variant="ghost"
              className="pointer-events-auto bg-popover/80 text-destructive"
              disabled={isPending}
              data-testid="item-delete-button"
            />
          }
        >
          <Trash2Icon />
          <span className="sr-only">Delete {item.label}</span>
        </AlertDialogTrigger>
        <AlertDialogContent size="sm">
          <AlertDialogHeader>
            <AlertDialogTitle>
              Delete &quot;{item.label}&quot;?
            </AlertDialogTitle>
            <AlertDialogDescription>
              This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              variant="destructive"
              onClick={handleDelete}
              disabled={isPending}
              data-testid="item-delete-confirm"
            >
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  )
}
