"use client"

import {
  useState,
  useEffect,
  useCallback,
  useReducer,
  useTransition,
} from "react"

import { toast } from "sonner"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
  TouchSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  arrayMove,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { reorderGroups } from "@/actions/groups"
import { reorderItems } from "@/actions/items"
import { updateDashboardTitle } from "@/actions/settings"
import type { GroupRow, GroupWithItems, ItemRow } from "@/lib/types"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { ThemeToggle } from "@/components/theme-toggle"
import { PaletteSwitcher } from "@/components/palette-switcher"
import { Group, GroupDragPreview } from "./group"
import { ItemCardDragPreview } from "./item"
import { EditBar } from "./edit-bar"
import { GroupDialog } from "@/components/editor/group-dialog"
import { ItemDialog } from "@/components/editor/item-dialog"
import { LoginForm } from "@/components/auth/login-form"
import { Palette } from "lucide-react"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

// ── Groups reducer for drag-and-drop state management ────────────────────────

export type GroupsAction =
  | { type: "SYNC"; groups: GroupWithItems[] }
  | { type: "DRAG_OVER"; activeId: string; overId: string }
  | { type: "DRAG_END_GROUP"; activeId: string; overId: string }
  | { type: "DRAG_END_ITEM"; activeId: string; overId: string }
  | { type: "ADD_ITEM"; groupId: string; item: ItemRow }
  | { type: "UPDATE_ITEM"; item: ItemRow }
  | { type: "DELETE_ITEM"; itemId: string }
  | { type: "ADD_GROUP"; group: GroupWithItems }
  | { type: "UPDATE_GROUP"; groupId: string; name: string }
  | { type: "DELETE_GROUP"; groupId: string }

export function groupsReducer(
  state: GroupWithItems[],
  action: GroupsAction
): GroupWithItems[] {
  switch (action.type) {
    case "SYNC":
      return action.groups

    case "DRAG_OVER": {
      const { activeId, overId } = action
      if (activeId === overId) return state

      const srcGroup = state.find((g) => g.items.some((i) => i.id === activeId))
      const draggedItem = srcGroup?.items.find((i) => i.id === activeId)
      if (!srcGroup || !draggedItem) return state

      const destGroup =
        state.find((g) => g.items.some((i) => i.id === overId)) ??
        state.find((g) => g.id === overId)

      if (!destGroup || srcGroup.id === destGroup.id) return state

      return state.map((g) => {
        if (g.id === srcGroup.id)
          return { ...g, items: g.items.filter((i) => i.id !== activeId) }
        if (g.id === destGroup.id) {
          const overIdx = g.items.findIndex((i) => i.id === overId)
          const newItems = [...g.items]
          newItems.splice(
            overIdx >= 0 ? overIdx : newItems.length,
            0,
            draggedItem
          )
          return { ...g, items: newItems }
        }
        return g
      })
    }

    case "DRAG_END_GROUP": {
      const oldIdx = state.findIndex((g) => g.id === action.activeId)
      const newIdx = state.findIndex((g) => g.id === action.overId)
      if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return state
      return arrayMove(state, oldIdx, newIdx)
    }

    case "DRAG_END_ITEM": {
      const destGroup = state.find((g) =>
        g.items.some((i) => i.id === action.activeId)
      )
      if (!destGroup) return state

      const activeIdx = destGroup.items.findIndex(
        (i) => i.id === action.activeId
      )
      const overIdx = destGroup.items.findIndex((i) => i.id === action.overId)

      if (activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx) {
        const reordered = arrayMove(destGroup.items, activeIdx, overIdx)
        return state.map((g) =>
          g.id === destGroup.id ? { ...g, items: reordered } : g
        )
      }
      return state
    }

    case "ADD_ITEM":
      return state.map((g) =>
        g.id === action.groupId ? { ...g, items: [...g.items, action.item] } : g
      )

    case "UPDATE_ITEM":
      return state.map((g) => ({
        ...g,
        items: g.items.map((i) =>
          i.id === action.item.id ? { ...i, ...action.item } : i
        ),
      }))

    case "DELETE_ITEM":
      return state.map((g) => ({
        ...g,
        items: g.items.filter((i) => i.id !== action.itemId),
      }))

    case "ADD_GROUP":
      return [...state, action.group]

    case "UPDATE_GROUP":
      return state.map((g) =>
        g.id === action.groupId ? { ...g, name: action.name } : g
      )

    case "DELETE_GROUP":
      return state.filter((g) => g.id !== action.groupId)

    default:
      return state
  }
}

type DashboardProps = {
  groups: GroupWithItems[]
  isLoggedIn: boolean
  title: string
}

export function Dashboard({ groups, isLoggedIn, title }: DashboardProps) {
  // ── Login dialog ───────────────────────────────────────────────────────────
  const [loginOpen, setLoginOpen] = useState(false)

  // ── Edit mode ──────────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false)
  const [titleChanged, setTitleChanged] = useState(false)

  // Use key to force re-render when server title changes, avoiding useEffect
  // Derive dashboardTitle from props + local edits
  const [localTitle, setLocalTitle] = useState<string | null>(null)
  const dashboardTitle = localTitle ?? title

  // Reset local title when server title changes
  const handleTitleReset = useCallback(() => {
    setLocalTitle(null)
    setTitleChanged(false)
  }, [])

  // ── Groups state with reducer ──────────────────────────────────────────────
  const [sortedGroups, dispatch] = useReducer(groupsReducer, groups)

  // Sync reducer when server pushes updated groups (after mutations / revalidatePath)
  useEffect(() => {
    dispatch({ type: "SYNC", groups })
  }, [groups])

  // ── DnD setup ──────────────────────────────────────────────────────────────
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<"group" | "item" | null>(null)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(TouchSensor, {
      activationConstraint: { delay: 250, tolerance: 5 },
    })
  )

  // ── Drag handlers ──────────────────────────────────────────────────────────
  const handleDragStart = useCallback((event: DragStartEvent) => {
    const id = String(event.active.id)
    const type = event.active.data.current?.type as "group" | "item"
    setActiveId(id)
    setActiveType(type)
  }, [])

  /** Cross-group item moves: update local state in real-time while dragging */
  const handleDragOver = useCallback((event: DragOverEvent) => {
    const { active, over } = event
    if (!over || active.id === over.id) return
    if (active.data.current?.type !== "item") return

    dispatch({
      type: "DRAG_OVER",
      activeId: String(active.id),
      overId: String(over.id),
    })
  }, [])

  const handleDragEnd = useCallback(
    (event: DragEndEvent) => {
      const { active, over } = event
      setActiveId(null)
      setActiveType(null)
      if (!over) return

      const activeId = String(active.id)
      const overId = String(over.id)
      const type = active.data.current?.type as "group" | "item"

      if (type === "group") {
        dispatch({ type: "DRAG_END_GROUP", activeId, overId })
        startTransition(() => reorderGroups(sortedGroups.map((g) => g.id)))
        return
      }

      if (type === "item") {
        // Check if within-group reordering is needed
        const destGroup = sortedGroups.find((g) =>
          g.items.some((i) => i.id === activeId)
        )
        if (!destGroup) return

        const activeIdx = destGroup.items.findIndex((i) => i.id === activeId)
        const overIdx = destGroup.items.findIndex((i) => i.id === overId)

        if (activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx) {
          // Within-group reorder
          dispatch({ type: "DRAG_END_ITEM", activeId, overId })
          const reordered = arrayMove(destGroup.items, activeIdx, overIdx)
          startTransition(() =>
            reorderItems(
              destGroup.id,
              reordered.map((i) => i.id)
            )
          )
        } else {
          // Cross-group move: persist current state
          startTransition(() =>
            reorderItems(
              destGroup.id,
              destGroup.items.map((i) => i.id)
            )
          )
        }
      }
    },
    [sortedGroups, startTransition]
  )

  // ── Dialog state ───────────────────────────────────────────────────────────
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<GroupRow | null>(null)
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingItem, setEditingItem] = useState<ItemRow | null>(null)
  const [itemGroupId, setItemGroupId] = useState<string | null>(null)

  const openAddGroup = useCallback(() => {
    setEditingGroup(null)
    setGroupDialogOpen(true)
  }, [])
  const openEditGroup = useCallback((g: GroupRow) => {
    setEditingGroup(g)
    setGroupDialogOpen(true)
  }, [])
  const openAddItem = useCallback((gid: string) => {
    setEditingItem(null)
    setItemGroupId(gid)
    setItemDialogOpen(true)
  }, [])
  const openEditItem = useCallback((i: ItemRow) => {
    setEditingItem(i)
    setItemGroupId(i.groupId)
    setItemDialogOpen(true)
  }, [])

  // ── Optimistic handlers ────────────────────────────────────────────────────
  const handleItemCreated = useCallback((groupId: string, item: ItemRow) => {
    dispatch({ type: "ADD_ITEM", groupId, item })
    toast.success(`${item.label || "Item"} added`)
  }, [])

  const handleItemUpdated = useCallback((item: ItemRow) => {
    dispatch({ type: "UPDATE_ITEM", item })
    toast.success(`${item.label || "Item"} saved`)
  }, [])

  const handleItemDeleted = useCallback((itemId: string) => {
    dispatch({ type: "DELETE_ITEM", itemId })
    toast.success("Item deleted")
  }, [])

  const handleGroupCreated = useCallback(
    (name: string) => {
      const tempGroup: GroupWithItems = {
        id: crypto.randomUUID(),
        name,
        order: sortedGroups.length,
        createdAt: null,
        items: [],
      }
      dispatch({ type: "ADD_GROUP", group: tempGroup })
      toast.success(`${name || "Group"} added`)
    },
    [sortedGroups.length]
  )

  const handleGroupUpdated = useCallback((groupId: string, name: string) => {
    dispatch({ type: "UPDATE_GROUP", groupId, name })
    toast.success(`${name || "Group"} saved`)
  }, [])

  const handleGroupDeleted = useCallback((groupId: string) => {
    dispatch({ type: "DELETE_GROUP", groupId })
    toast.success("Group deleted")
  }, [])

  // ── Render ─────────────────────────────────────────────────────────────────
  const groupIds = sortedGroups.map((g) => g.id)

  return (
    <>
      <div className={cn("min-h-svh p-6", editMode && "pb-24")}>
        {/* Header */}
        <header className="mb-8 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
          {editMode ? (
            <Input
              value={dashboardTitle}
              onChange={(e) => {
                setLocalTitle(e.target.value)
                setTitleChanged(true)
              }}
              className="h-8 w-full max-w-[200px]"
              data-testid="dashboard-title-input"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  handleTitleReset()
                  setEditMode(false)
                }
              }}
              autoFocus
            />
          ) : (
            <h1 className="text-lg font-semibold" data-testid="dashboard-title">
              {dashboardTitle}
            </h1>
          )}
          <div className="flex items-center gap-2">
            <DropdownMenu>
              <DropdownMenuTrigger
                render={(props) => (
                  <Button variant="outline" size="icon" {...props}>
                    <Palette className="h-4 w-4" />
                    <span className="sr-only">Theme settings</span>
                  </Button>
                )}
              />
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Theme</DropdownMenuLabel>
                  <ThemeToggle />
                </DropdownMenuGroup>
                <DropdownMenuSeparator />
                <DropdownMenuGroup>
                  <DropdownMenuLabel>Palette</DropdownMenuLabel>
                  <PaletteSwitcher />
                </DropdownMenuGroup>
              </DropdownMenuContent>
            </DropdownMenu>
            {isLoggedIn ? (
              <>
                {!editMode && (
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={() => setEditMode(true)}
                    data-testid="edit-button"
                  >
                    Edit
                  </Button>
                )}
              </>
            ) : (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setLoginOpen(true)}
                data-testid="sign-in-link"
              >
                Sign in to edit
              </Button>
            )}
          </div>
        </header>

        {/* Dashboard body */}
        <DndContext
          sensors={sensors}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
        >
          <SortableContext
            items={groupIds}
            strategy={verticalListSortingStrategy}
          >
            {sortedGroups.length === 0 ? (
              <EmptyState isLoggedIn={isLoggedIn} editMode={editMode} />
            ) : (
              <div className="flex flex-col gap-8">
                {sortedGroups.map((group) => (
                  <Group
                    key={group.id}
                    group={group}
                    editMode={editMode}
                    onEditGroup={openEditGroup}
                    onAddItem={openAddItem}
                    onEditItem={openEditItem}
                    onGroupDeleted={handleGroupDeleted}
                    onItemDeleted={handleItemDeleted}
                  />
                ))}
              </div>
            )}
          </SortableContext>

          <DragOverlay>
            {activeType === "group" &&
              activeId &&
              (() => {
                const group = sortedGroups.find((g) => g.id === activeId)
                return group ? <GroupDragPreview group={group} /> : null
              })()}
            {activeType === "item" &&
              activeId &&
              (() => {
                const item = sortedGroups
                  .flatMap((g) => g.items)
                  .find((i) => i.id === activeId)
                return item ? <ItemCardDragPreview item={item} /> : null
              })()}
          </DragOverlay>
        </DndContext>
      </div>

      {editMode && isLoggedIn && (
        <EditBar
          onAddGroup={openAddGroup}
          onDone={() => {
            if (titleChanged && dashboardTitle.trim()) {
              startTransition(() => {
                updateDashboardTitle(dashboardTitle.trim()).then(() => {
                  handleTitleReset()
                  setEditMode(false)
                  toast.success("Dashboard saved")
                })
              })
            } else {
              setEditMode(false)
            }
          }}
        />
      )}

      <GroupDialog
        open={groupDialogOpen}
        onOpenChange={(o) => setGroupDialogOpen(o)}
        group={editingGroup}
        onSuccess={(name, groupId) => {
          if (groupId) handleGroupUpdated(groupId, name)
          else handleGroupCreated(name)
        }}
      />
      <ItemDialog
        open={itemDialogOpen}
        onOpenChange={(o) => setItemDialogOpen(o)}
        existingItem={editingItem}
        groupId={itemGroupId}
        onSuccess={(item, isNew) => {
          if (isNew) handleItemCreated(item.groupId, item)
          else handleItemUpdated(item)
        }}
      />

      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign in</DialogTitle>
          </DialogHeader>
          <LoginForm />
        </DialogContent>
      </Dialog>
    </>
  )
}

function EmptyState({
  isLoggedIn,
  editMode,
}: {
  isLoggedIn: boolean
  editMode: boolean
}) {
  return (
    <div
      className="flex flex-col items-center justify-center rounded-xl border bg-muted/30 py-24 text-center"
      data-testid="empty-state"
    >
      <p
        className="text-sm text-muted-foreground"
        data-testid="empty-state-message"
      >
        {isLoggedIn ? (
          editMode ? (
            'Use "Add group" below to get started.'
          ) : (
            <>
              No groups yet. Click <strong>Edit</strong> to start.
            </>
          )
        ) : (
          "Nothing here yet."
        )}
      </p>
    </div>
  )
}
