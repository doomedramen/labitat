"use client";

/**
 * Simplified GroupCard for edit mode.
 * Shows group name + simplified item cards with drag handles and edit/delete buttons.
 */

import { useSortable } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { SortableContext, rectSortingStrategy } from "@dnd-kit/sortable";
import { cn } from "@/lib/utils";
import type { GroupWithCache, GroupWithItems, ItemWithCache } from "@/lib/types";
import { ItemCardDummy } from "./item/item-card-dummy";
import { Pencil, Trash2, GripVertical, Plus } from "lucide-react";
import { useState } from "react";
import { ConfirmDialog } from "@/components/confirm-dialog";
import { deleteGroup } from "@/actions/groups";
import { deleteItem } from "@/actions/items";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";

interface GroupCardDummyProps {
  group: GroupWithCache;
  editMode: boolean;
  onEditGroup: () => void;
  onAddItem: () => void;
  onEditItem: (item: ItemWithCache) => void;
  onGroupsChanged: (groups: GroupWithItems[]) => void;
}

export function GroupCardDummy({
  group,
  editMode,
  onEditGroup,
  onAddItem,
  onEditItem,
  onGroupsChanged,
}: GroupCardDummyProps) {
  const haptic = useWebHaptics();
  const [deleteConfirmOpen, setDeleteConfirmOpen] = useState(false);

  const handleDeleteItem = async (id: string) => {
    try {
      const updated = await deleteItem(id);
      onGroupsChanged(updated);
      haptic.trigger("warning");
    } catch {
      toast.error("Failed to delete item");
      haptic.trigger("error");
    }
  };

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id: group.id,
    data: { type: "group" },
    disabled: !editMode,
  });

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
  };

  return (
    <>
      <section
        ref={setNodeRef}
        style={style}
        className="group/group relative rounded-2xl border border-border/60 bg-card/25 p-3 sm:p-4"
      >
        <header className="mb-3 flex items-center gap-2 border-b border-border/50 pb-3">
          <button
            type="button"
            {...attributes}
            {...listeners}
            className="-ml-1 flex size-8 cursor-grab items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground active:cursor-grabbing"
            aria-label="Drag to reorder group"
          >
            <GripVertical className="h-4 w-4" />
          </button>
          <h2 className="min-w-0 flex-1 truncate text-sm font-semibold tracking-[-0.01em]">
            {group.name}
          </h2>
          <span className="hidden text-xs tabular-nums text-muted-foreground sm:inline">
            {group.items.length} {group.items.length === 1 ? "item" : "items"}
          </span>
          <div className="flex items-center gap-1">
            <button
              type="button"
              onClick={onEditGroup}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-muted hover:text-foreground"
              aria-label="Edit group"
            >
              <Pencil className="h-4 w-4" />
            </button>
            <button
              type="button"
              onClick={() => setDeleteConfirmOpen(true)}
              className="flex size-8 items-center justify-center rounded-md text-muted-foreground transition-colors hover:bg-destructive/10 hover:text-destructive"
              aria-label="Delete group"
            >
              <Trash2 className="h-4 w-4" />
            </button>
          </div>
        </header>

        {/* Items grid */}
        <SortableContext items={group.items.map((i) => i.id)} strategy={rectSortingStrategy}>
          <div
            className={cn(
              "grid items-start gap-3.5",
              "grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4",
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
              className="group/add-item flex min-h-24 items-center justify-center rounded-xl border border-dashed border-border/70 bg-background/20 text-sm font-medium text-muted-foreground transition-[border-color,background-color,color] duration-200 hover:border-ring hover:bg-muted/50 hover:text-foreground"
            >
              <Plus className="mr-1.5 h-4 w-4 transition-transform duration-200 group-hover/add-item:rotate-90" />
              Add item
            </button>
          </div>
        </SortableContext>
      </section>

      <ConfirmDialog
        open={deleteConfirmOpen}
        onOpenChange={setDeleteConfirmOpen}
        title="Delete group"
        description={`Are you sure you want to delete "${group.name}"? All items inside will also be deleted. This cannot be undone.`}
        onConfirm={async () => {
          try {
            const updated = await deleteGroup(group.id);
            onGroupsChanged(updated);
            haptic.trigger("warning");
          } catch {
            toast.error("Failed to delete group");
            haptic.trigger("error");
          }
          setDeleteConfirmOpen(false);
        }}
      />
    </>
  );
}
