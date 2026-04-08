"use client"

import { useState } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import type { GroupWithCache, ItemRow } from "@/lib/types"
import { ItemCard } from "./item/item-card"
import { deleteGroup } from "@/actions/groups"
import { deleteItem } from "@/actions/items"
import { Pencil, Trash2, Plus, GripVertical } from "lucide-react"
import { ConfirmDialog } from "@/components/confirm-dialog"

interface GroupCardProps {
  group: GroupWithCache
  editMode: boolean
  onEditGroup: () => void
  onAddItem: () => void
  onEditItem: (item: ItemRow) => void
}

export function GroupCard({
  group,
  editMode,
  onEditGroup,
  onAddItem,
  onEditItem,
}: GroupCardProps) {
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const {
    attributes,
    listeners,
    setNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: group.id,
    data: { type: "group" },
    disabled: !editMode,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
  }

  return (
    <>
      <div ref={setNodeRef} style={style} className="group/group relative">
        {/* Group header */}
        <div className="mb-2 flex items-center gap-2">
          {editMode && (
            <button
              {...attributes}
              {...listeners}
              className="cursor-grab text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
              aria-label="Drag to reorder group"
            >
              <GripVertical className="h-4 w-4" />
            </button>
          )}
          <h2 className="flex-1 text-sm font-medium text-muted-foreground">
            {group.name}
          </h2>
          {editMode && (
            <div className="flex items-center gap-1">
              <button
                onClick={onEditGroup}
                className="rounded p-1 text-muted-foreground hover:bg-secondary hover:text-foreground"
                aria-label="Edit group"
              >
                <Pencil className="h-4 w-4" />
              </button>
              <button
                onClick={() => setDeleteConfirmOpen(true)}
                className="rounded p-1 text-muted-foreground hover:bg-destructive/10 hover:text-destructive"
                aria-label="Delete group"
              >
                <Trash2 className="h-4 w-4" />
              </button>
            </div>
          )}
        </div>

        {/* Items grid */}
        <div
          className={cn(
            "grid items-start gap-3",
            "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
          )}
        >
          {group.items.map((item) => (
            <ItemCard
              key={item.id}
              item={item}
              editMode={editMode}
              onEdit={onEditItem}
              onDeleted={(id) => deleteItem(id)}
            />
          ))}
          {editMode && (
            <button
              onClick={onAddItem}
              className="flex min-h-20 items-center justify-center rounded-xl border-2 border-dashed border-border/50 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
            >
              <Plus className="mr-1.5 h-4 w-4" />
              Add Item
            </button>
          )}
        </div>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete group"
        description={`Are you sure you want to delete "${group.name}"? All items inside will also be deleted. This cannot be undone.`}
        onConfirm={() => {
          deleteGroup(group.id)
          setDeleteConfirmOpen(false)
        }}
      />
    </>
  )
}
