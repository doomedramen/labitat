"use client"

import { useTransition, useState } from "react"
import {
  ChevronDownIcon,
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
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Collapsible, CollapsibleContent } from "@/components/ui/collapsible"
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
  const [collapsed, setCollapsed] = useState(() => {
    try {
      const stored = localStorage.getItem("labitat-collapsed-groups")
      if (stored) {
        const ids = JSON.parse(stored) as string[]
        return ids.includes(group.id)
      }
    } catch {}
    return false
  })

  const handleOpenChange = (open: boolean) => {
    setCollapsed((prev) => {
      const next = !open
      try {
        const stored = localStorage.getItem("labitat-collapsed-groups")
        const ids: string[] = stored ? JSON.parse(stored) : []
        if (next) {
          if (!ids.includes(group.id)) ids.push(group.id)
        } else {
          const idx = ids.indexOf(group.id)
          if (idx >= 0) ids.splice(idx, 1)
        }
        localStorage.setItem("labitat-collapsed-groups", JSON.stringify(ids))
      } catch {}
      return next
    })
  }

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
    <Collapsible
      ref={setNodeRef}
      style={style}
      open={!collapsed}
      onOpenChange={handleOpenChange}
      className="space-y-3"
      data-group-id={group.id}
      data-testid="group"
      aria-label={group.name}
    >
      {/* Group header */}
      <div className="flex items-center gap-1.5">
        {editMode ? (
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
        ) : (
          <button
            onClick={() => setCollapsed((prev) => !prev)}
            className="flex items-center gap-1.5 text-muted-foreground/40 hover:text-muted-foreground"
            aria-label={collapsed ? "Expand group" : "Collapse group"}
          >
            <ChevronDownIcon
              className={cn(
                "size-3.5 transition-transform duration-200",
                collapsed && "-rotate-90"
              )}
            />
            <h2
              className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
              data-testid="group-name"
            >
              {group.name}
            </h2>
          </button>
        )}

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

      {/* Items grid — collapsible in view mode */}
      <CollapsibleContent className="overflow-hidden">
        <div className="p-0.5">
          <SortableContext items={itemIds} strategy={rectSortingStrategy}>
            <div
              data-group-id={group.id}
              data-type="group"
              className="grid grid-cols-1 items-start gap-2 sm:grid-cols-[repeat(auto-fit,minmax(280px,1fr))]"
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
        </div>
      </CollapsibleContent>
    </Collapsible>
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
