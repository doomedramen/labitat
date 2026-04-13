"use client"

/**
 * Simplified GroupCard for edit mode.
 * Shows group name + simplified item cards with drag handles and edit/delete buttons.
 */

import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable"
import { cn } from "@/lib/utils"
import type { GroupWithCache, GroupWithItems, ItemWithCache } from "@/lib/types"
import { ItemCardDummy } from "./item/item-card-dummy"
import { Pencil, Trash2, GripVertical, Plus } from "lucide-react"
import { useState } from "react"
import { ConfirmDialog } from "@/components/confirm-dialog"
import { deleteGroup } from "@/actions/groups"
import { deleteItem } from "@/actions/items"
import { toast } from "sonner"
import { useWebHaptics } from "web-haptics/react"

interface GroupCardDummyProps {
  group: GroupWithCache
  editMode: boolean
  onEditGroup: () => void
  onAddItem: () => void
  onEditItem: (item: ItemWithCache) => void
  onGroupsChanged: (groups: GroupWithItems[]) => void
}

export function GroupCardDummy({
  group,
  editMode,
  onEditGroup,
  onAddItem,
  onEditItem,
  onGroupsChanged,
}: GroupCardDummyProps) {
  const haptic = useWebHaptics()
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false)

  const handleDeleteItem = async (id: string) => {
    try {
      const updated = await deleteItem(id)
      onGroupsChanged(updated)
      haptic.trigger("warning")
    } catch {
      toast.error("Failed to delete item")
      haptic.trigger("error")
    }
  }

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
          <button
            {...attributes}
            {...listeners}
            className="cursor-grab text-muted-foreground/50 transition-all duration-200 hover:scale-110 hover:text-muted-foreground active:scale-95 active:cursor-grabbing"
            aria-label="Drag to reorder group"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <h2 className="flex-1 text-sm font-medium text-muted-foreground transition-colors duration-200 select-none group-hover/group:text-foreground">
            {group.name}
          </h2>
          <div className="flex items-center gap-1">
            <button
              onClick={onEditGroup}
              className="rounded p-1 text-muted-foreground transition-all duration-200 hover:scale-110 hover:bg-secondary hover:text-foreground active:scale-95"
              aria-label="Edit group"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              onClick={() => setDeleteConfirmOpen(true)}
              className="rounded p-1 text-muted-foreground transition-all duration-200 hover:scale-110 hover:bg-destructive/10 hover:text-destructive active:scale-95"
              aria-label="Delete group"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Items grid */}
        <SortableContext
          items={group.items.map((i) => i.id)}
          strategy={rectSortingStrategy}
        >
          <div
            className={cn(
              "grid items-start gap-3",
              "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4"
            )}
          >
            {group.items.map((item) => (
              <ItemCardDummy
                key={item.id}
                item={item}
                editMode={editMode}
                onEdit={onEditItem}
                onDeleted={handleDeleteItem}
              />
            ))}
            <button
              type="button"
              onClick={onAddItem}
              className="group/add-item flex min-h-20 items-center justify-center rounded-xl border-2 border-dashed border-border/50 text-sm text-muted-foreground transition-all duration-300 hover:scale-[1.02] hover:border-ring hover:bg-secondary/50 hover:text-foreground hover:shadow-md active:scale-[0.98]"
            >
              <Plus className="mr-1.5 h-4 w-4 transition-transform duration-300 group-hover/add-item:rotate-90" />
              Add Item
            </button>
          </div>
        </SortableContext>
      </div>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete group"
        description={`Are you sure you want to delete "${group.name}"? All items inside will also be deleted. This cannot be undone.`}
        onConfirm={async () => {
          try {
            const updated = await deleteGroup(group.id)
            onGroupsChanged(updated)
            haptic.trigger("warning")
          } catch {
            toast.error("Failed to delete group")
            haptic.trigger("error")
          }
          setDeleteConfirmOpen(false)
        }}
      />
    </>
  )
}
