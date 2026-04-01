"use client"

import { useTransition } from "react"
import {
  GripVerticalIcon,
  PencilIcon,
  PlusIcon,
  Trash2Icon,
} from "lucide-react"
import {
  useSortable,
  SortableContext,
  rectSortingStrategy,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { deleteGroup } from "@/actions/groups"
import type { GroupRow, GroupWithItems, ItemRow } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { ItemCard } from "./item"
import { WidgetErrorBoundary } from "./error-boundary"
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

type GroupProps = {
  group: GroupWithItems
  editMode: boolean
  onEditGroup: (group: GroupRow) => void
  onAddItem: (groupId: string) => void
  onEditItem: (item: ItemRow) => void
  onGroupDeleted?: (groupId: string) => void
  onItemDeleted?: (itemId: string) => void
}

export function Group({
  group,
  editMode,
  onEditGroup,
  onAddItem,
  onEditItem,
  onGroupDeleted,
  onItemDeleted,
}: GroupProps) {
  const [isPending, startTransition] = useTransition()

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
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

  const itemIds = group.items.map((i) => i.id)

  return (
    <section
      ref={setNodeRef}
      style={style}
      aria-label={group.name}
      data-testid="group"
      data-group-id={group.id}
    >
      {/* Group header */}
      <div className="mb-3 flex items-center gap-1.5">
        {editMode && (
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
            aria-label="Drag to reorder group"
            data-testid="group-drag-handle"
          >
            <GripVerticalIcon className="size-4" />
          </button>
        )}

        <h2
          className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
          data-testid="group-name"
        >
          {group.name}
        </h2>

        {editMode && (
          <>
            <Button
              size="icon-xs"
              variant="ghost"
              onClick={() => onEditGroup(group)}
              data-testid="group-edit-button"
            >
              <PencilIcon />
              <span className="sr-only">Edit {group.name}</span>
            </Button>

            <AlertDialog>
              <AlertDialogTrigger
                render={
                  <Button
                    size="icon-xs"
                    variant="ghost"
                    className="text-destructive"
                    disabled={isPending}
                    data-testid="group-delete-button"
                  />
                }
              >
                <Trash2Icon />
                <span className="sr-only">Delete {group.name}</span>
              </AlertDialogTrigger>
              <AlertDialogContent size="sm">
                <AlertDialogHeader>
                  <AlertDialogTitle>
                    Delete &quot;{group.name}&quot;?
                  </AlertDialogTitle>
                  <AlertDialogDescription>
                    All items inside this group will be permanently deleted.
                  </AlertDialogDescription>
                </AlertDialogHeader>
                <AlertDialogFooter>
                  <AlertDialogCancel>Cancel</AlertDialogCancel>
                  <AlertDialogAction
                    variant="destructive"
                    disabled={isPending}
                    onClick={() => {
                      onGroupDeleted?.(group.id)
                      startTransition(() => deleteGroup(group.id))
                    }}
                    data-testid="group-delete-confirm"
                  >
                    Delete
                  </AlertDialogAction>
                </AlertDialogFooter>
              </AlertDialogContent>
            </AlertDialog>
          </>
        )}
      </div>

      {/* Items grid */}
      <SortableContext items={itemIds} strategy={rectSortingStrategy}>
        <div
          data-group-id={group.id}
          data-type="group"
          className="grid grid-cols-1 items-start gap-2 sm:grid-cols-2 lg:grid-cols-[repeat(auto-fit,minmax(180px,1fr))]"
          data-testid="group-items-container"
        >
          {group.items.map((item) => (
            <WidgetErrorBoundary key={item.id}>
              <ItemCard
                item={item}
                editMode={editMode}
                onEdit={onEditItem}
                onDeleted={onItemDeleted}
              />
            </WidgetErrorBoundary>
          ))}

          {editMode && (
            <button
              onClick={() => onAddItem(group.id)}
              className="flex min-h-[3.25rem] items-center justify-center gap-1.5 rounded-xl border border-dashed border-border text-sm text-muted-foreground transition-colors hover:border-foreground/30 hover:bg-muted/30 hover:text-foreground"
              data-testid="add-item-button"
            >
              <PlusIcon className="size-4" />
              Add item
            </button>
          )}
        </div>
      </SortableContext>
    </section>
  )
}

/** Shown inside DragOverlay while a group is being dragged */
export function GroupDragPreview({ group }: { group: GroupWithItems }) {
  return (
    <div className="cursor-grabbing rounded-xl bg-background/80 px-3 py-2 shadow-lg ring-2 ring-primary/30 backdrop-blur-sm">
      <span className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
        {group.name}
      </span>
      <span className="ml-2 text-xs text-muted-foreground/60">
        {group.items.length} item{group.items.length !== 1 ? "s" : ""}
      </span>
    </div>
  )
}
