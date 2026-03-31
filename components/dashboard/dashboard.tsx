/* eslint-disable react-hooks/refs */
"use client"

import { useState, useEffect, useCallback, useRef, useTransition } from "react"
import Link from "next/link"
import {
  DndContext,
  DragOverlay,
  PointerSensor,
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
import { Button, buttonVariants } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { ThemeSwitcher } from "@/components/theme-switcher"
import { Group, GroupDragPreview } from "./group"
import { ItemCardDragPreview } from "./item"
import { EditBar } from "./edit-bar"
import { GroupDialog } from "@/components/editor/group-dialog"
import { ItemDialog } from "@/components/editor/item-dialog"

type DashboardProps = {
  groups: GroupWithItems[]
  isLoggedIn: boolean
  title: string
}

export function Dashboard({ groups, isLoggedIn, title }: DashboardProps) {
  // ── Edit mode ──────────────────────────────────────────────────────────────
  const [editMode, setEditMode] = useState(false)
  const [dashboardTitle, setDashboardTitle] = useState(title)
  const [titleChanged, setTitleChanged] = useState(false)

  // Sync title when server data changes
  useEffect(() => {
    setDashboardTitle(title)
    setTitleChanged(false)
  }, [title])

  // ── Sorted groups (local optimistic state) ─────────────────────────────────
  const [sortedGroups, setSortedGroups] = useState<GroupWithItems[]>(groups)
  // Keep a ref so drag event handlers always see fresh state
  const sortedGroupsRef = useRef(sortedGroups)
  useEffect(() => {
    sortedGroupsRef.current = sortedGroups
  }, [sortedGroups])

  // Sync when server sends updated data (after mutations / revalidatePath)
  useEffect(() => {
    setSortedGroups(groups)
  }, [groups])

  // ── DnD setup ──────────────────────────────────────────────────────────────
  const [activeId, setActiveId] = useState<string | null>(null)
  const [activeType, setActiveType] = useState<"group" | "item" | null>(null)
  const [, startTransition] = useTransition()

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } })
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

    const activeId = String(active.id)
    const overId = String(over.id)
    const groups = sortedGroupsRef.current

    // Identify source group from current local state (not from stale dnd data)
    const srcGroupId = groups.find((g) =>
      g.items.some((i) => i.id === activeId)
    )?.id
    // Destination: either an item's group or a group container directly
    const destGroupId =
      over.data.current?.type === "item"
        ? groups.find((g) => g.items.some((i) => i.id === overId))?.id
        : over.data.current?.type === "group"
          ? overId
          : undefined

    if (!srcGroupId || !destGroupId || srcGroupId === destGroupId) return

    setSortedGroups((prev) => {
      const srcGroup = prev.find((g) => g.id === srcGroupId)
      const draggedItem = srcGroup?.items.find((i) => i.id === activeId)
      if (!srcGroup || !draggedItem) return prev

      return prev.map((g) => {
        if (g.id === srcGroupId)
          return { ...g, items: g.items.filter((i) => i.id !== activeId) }
        if (g.id === destGroupId) {
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
      const groups = sortedGroupsRef.current

      if (type === "group") {
        const oldIdx = groups.findIndex((g) => g.id === activeId)
        const newIdx = groups.findIndex((g) => g.id === overId)
        if (oldIdx === -1 || newIdx === -1 || oldIdx === newIdx) return
        const reordered = arrayMove(groups, oldIdx, newIdx)
        setSortedGroups(reordered)
        startTransition(() => reorderGroups(reordered.map((g) => g.id)))
        return
      }

      if (type === "item") {
        // The item is already in its final group (thanks to onDragOver).
        // We may still need within-group reordering if over is a sibling item.
        const destGroup = groups.find((g) =>
          g.items.some((i) => i.id === activeId)
        )
        if (!destGroup) return

        const activeIdx = destGroup.items.findIndex((i) => i.id === activeId)
        const overIdx = destGroup.items.findIndex((i) => i.id === overId)

        if (activeIdx !== -1 && overIdx !== -1 && activeIdx !== overIdx) {
          const reordered = arrayMove(destGroup.items, activeIdx, overIdx)
          setSortedGroups((prev) =>
            prev.map((g) =>
              g.id === destGroup.id ? { ...g, items: reordered } : g
            )
          )
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
    [startTransition]
  )

  // ── Keyboard shortcut: E to toggle edit mode ───────────────────────────────
  useEffect(() => {
    if (!isLoggedIn) return
    const handler = (e: KeyboardEvent) => {
      if (e.key !== "e" && e.key !== "E") return
      if (e.metaKey || e.ctrlKey || e.altKey) return
      const t = e.target as HTMLElement
      if (
        t.tagName === "INPUT" ||
        t.tagName === "TEXTAREA" ||
        t.tagName === "SELECT" ||
        t.isContentEditable
      )
        return
      setEditMode((m) => !m)
    }
    window.addEventListener("keydown", handler)
    return () => window.removeEventListener("keydown", handler)
  }, [isLoggedIn])

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

  // ── Render ─────────────────────────────────────────────────────────────────
  const groupIds = sortedGroups.map((g) => g.id)

  return (
    <>
      <div className={cn("min-h-svh p-6", editMode && "pb-24")}>
        {/* Header */}
        <header className="mb-8 flex items-center justify-between gap-4">
          {editMode ? (
            <Input
              value={dashboardTitle}
              onChange={(e) => {
                setDashboardTitle(e.target.value)
                setTitleChanged(true)
              }}
              className="h-8 w-[200px]"
              onKeyDown={(e) => {
                if (e.key === "Escape") {
                  setDashboardTitle(title)
                  setTitleChanged(false)
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
            <ThemeSwitcher />
            {isLoggedIn ? (
              !editMode && (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => setEditMode(true)}
                  data-testid="edit-button"
                >
                  Edit
                </Button>
              )
            ) : (
              <Link
                href="/login"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" })
                )}
                data-testid="sign-in-link"
              >
                Sign in to edit
              </Link>
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
                  />
                ))}
              </div>
            )}
          </SortableContext>

          <DragOverlay>
            {activeType === "group" &&
              activeId &&
              (() => {
                const group = sortedGroupsRef.current.find(
                  (g) => g.id === activeId
                )
                return group ? <GroupDragPreview group={group} /> : null
              })()}
            {activeType === "item" &&
              activeId &&
              (() => {
                const item = sortedGroupsRef.current
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
                  setTitleChanged(false)
                  setEditMode(false)
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
      />
      <ItemDialog
        open={itemDialogOpen}
        onOpenChange={(o) => setItemDialogOpen(o)}
        item={editingItem}
        groupId={itemGroupId}
      />
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
      className="flex flex-col items-center justify-center py-24 text-center"
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
              No groups yet. Click <strong>Edit</strong> or press{" "}
              <kbd className="rounded border px-1 font-mono text-xs">E</kbd> to
              start.
            </>
          )
        ) : (
          "Nothing here yet."
        )}
      </p>
    </div>
  )
}
