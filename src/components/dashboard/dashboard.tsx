"use client"

import { useEffect, useMemo, useState } from "react"
import { useForm } from "@tanstack/react-form"
import { z } from "zod"
import {
  DndContext,
  DragOverlay,
  closestCenter,
  KeyboardSensor,
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
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Palette, LogIn, Plus, Loader2 } from "lucide-react"
import { toast } from "sonner"
import { useWebHaptics } from "web-haptics/react"

import { cn } from "@/lib/utils"
import type { GroupWithCache, GroupWithItems, ItemWithCache } from "@/lib/types"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuGroup,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { ThemeToggle } from "@/components/theme-toggle"
import { PaletteSwitcher } from "@/components/palette-switcher"
import { LoginForm } from "@/components/auth/login-form"
import { GroupCard } from "./group"
import { EditBar } from "./edit-bar"
import { GroupDialog } from "@/components/editor/group-dialog"
import { ItemDialog } from "@/components/editor/item-dialog"
import { ItemCardDragPreview } from "./item/item-card"
import { reorderGroups } from "@/actions/groups"
import { reorderItems } from "@/actions/items"
import { updateDashboardTitle } from "@/actions/settings"

interface DashboardProps {
  groups: GroupWithCache[]
  isLoggedIn: boolean
  title: string
}

export function Dashboard({ groups, isLoggedIn, title }: DashboardProps) {
  const haptic = useWebHaptics()
  const [editMode, setEditMode] = useState(false)
  const [localTitle, setLocalTitle] = useState<string | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<GroupWithCache | null>(null)
  const [editingItem, setEditingItem] = useState<ItemWithCache | null>(null)
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null)

  // Optimistic state for DnD — keeps UI smooth while server round-trips
  const [localGroups, setLocalGroups] = useState<GroupWithCache[]>(groups)
  useEffect(() => {
    setLocalGroups(groups)
  }, [groups])

  // Enrich server-returned groups with cached widget data from current state
  function handleGroupsUpdated(newGroups: GroupWithItems[]) {
    const cacheMap = new Map<
      string,
      {
        widgetData: ItemWithCache["cachedWidgetData"]
        pingStatus: ItemWithCache["cachedPingStatus"]
      }
    >()
    for (const g of localGroups) {
      for (const item of g.items) {
        cacheMap.set(item.id, {
          widgetData: item.cachedWidgetData,
          pingStatus: item.cachedPingStatus,
        })
      }
    }
    const enriched: GroupWithCache[] = newGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        const cached = cacheMap.get(item.id)
        return {
          ...item,
          cachedWidgetData: cached?.widgetData ?? null,
          cachedPingStatus: cached?.pingStatus ?? null,
        } as ItemWithCache
      }),
    }))
    setLocalGroups(enriched)
  }

  // Track the active drag item/group for DragOverlay and cross-group logic
  const [activeId, setActiveId] = useState<string | null>(null)
  const [dragStartGroupId, setDragStartGroupId] = useState<string | null>(null)

  const { activeItem, activeGroup } = useMemo(() => {
    if (!activeId) return { activeItem: null, activeGroup: null }
    const item =
      localGroups.flatMap((g) => g.items).find((i) => i.id === activeId) ?? null
    const group = !item
      ? (localGroups.find((g) => g.id === activeId) ?? null)
      : null
    return { activeItem: item, activeGroup: group }
  }, [activeId, localGroups])

  const dashboardTitle = localTitle ?? title

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  function findItemGroupId(itemId: string, from = localGroups) {
    return from.find((g) => g.items.some((i) => i.id === itemId))?.id
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string
    setActiveId(id)
    if (event.active.data.current?.type === "item") {
      setDragStartGroupId(findItemGroupId(id) ?? null)
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event
    if (!over || active.data.current?.type !== "item") return

    const activeId = active.id as string
    const overId = over.id as string

    const activeGroupId = findItemGroupId(activeId)
    const overGroupId =
      findItemGroupId(overId) ??
      (localGroups.some((g) => g.id === overId) ? overId : undefined)

    if (!activeGroupId || !overGroupId || activeGroupId === overGroupId) return

    // Optimistically move the item into the target group
    setLocalGroups((prev) => {
      const srcGroup = prev.find((g) => g.id === activeGroupId)!
      const item = srcGroup.items.find((i) => i.id === activeId)!
      return prev.map((g) => {
        if (g.id === activeGroupId)
          return { ...g, items: g.items.filter((i) => i.id !== activeId) }
        if (g.id === overGroupId) return { ...g, items: [...g.items, item] }
        return g
      })
    })
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event
    setActiveId(null)

    if (!over) {
      setLocalGroups(groups) // revert on cancel
      setDragStartGroupId(null)
      return
    }

    // Haptic feedback on successful drop
    haptic.trigger("medium")

    const activeId = active.id as string
    const overId = over.id as string
    const type = active.data.current?.type

    if (type === "group") {
      const oldIndex = localGroups.findIndex((g) => g.id === activeId)
      const newIndex = localGroups.findIndex((g) => g.id === overId)
      if (oldIndex !== newIndex) {
        const reordered = arrayMove(localGroups, oldIndex, newIndex)
        const snapshot = localGroups
        setLocalGroups(reordered)
        reorderGroups(reordered.map((g) => g.id)).catch(() => {
          setLocalGroups(snapshot)
          toast.error("Failed to reorder groups")
        })
      }
    } else if (type === "item") {
      // By the time drag ends, handleDragOver has already moved the item into
      // the correct group. We just need to finalise the position within that group.
      const currentGroupId = findItemGroupId(activeId)
      if (!currentGroupId) {
        setDragStartGroupId(null)
        return
      }

      const currentGroup = localGroups.find((g) => g.id === currentGroupId)!
      const activeIdx = currentGroup.items.findIndex((i) => i.id === activeId)
      const overIdx = currentGroup.items.findIndex((i) => i.id === overId)

      let finalItems = currentGroup.items
      if (overIdx !== -1 && activeIdx !== overIdx) {
        finalItems = arrayMove(currentGroup.items, activeIdx, overIdx)
        const snapshot = localGroups
        setLocalGroups((prev) =>
          prev.map((g) =>
            g.id === currentGroupId ? { ...g, items: finalItems } : g
          )
        )
        reorderItems(
          currentGroupId,
          finalItems.map((i) => i.id)
        ).catch(() => {
          setLocalGroups(snapshot)
          toast.error("Failed to reorder items")
        })
      } else {
        reorderItems(
          currentGroupId,
          finalItems.map((i) => i.id)
        ).catch(() => {
          toast.error("Failed to save item order")
        })
      }

      // If cross-group, also persist the (now item-less) source group
      if (dragStartGroupId && dragStartGroupId !== currentGroupId) {
        const srcGroup = localGroups.find((g) => g.id === dragStartGroupId)
        if (srcGroup)
          reorderItems(
            dragStartGroupId,
            srcGroup.items.map((i) => i.id)
          )
      }
    }

    setDragStartGroupId(null)
  }

  const [savingTitle, setSavingTitle] = useState(false)

  async function handleSaveTitle() {
    if (localTitle && localTitle.trim()) {
      setSavingTitle(true)
      try {
        await updateDashboardTitle(localTitle.trim())
        toast.success("Dashboard saved")
        haptic.trigger("success")
      } catch {
        toast.error("Failed to save title")
        haptic.trigger("error")
      } finally {
        setSavingTitle(false)
      }
    }
  }

  const titleForm = useForm({
    defaultValues: {
      title: title,
    },
    validators: {
      onChange: z.object({
        title: z.string().min(1, "Title is required."),
      }),
    },
  })

  useEffect(() => {
    titleForm.setFieldValue("title", localTitle ?? title)
    // eslint-disable-next-line react-hooks/exhaustive-deps -- titleForm is a stable reference from useForm
  }, [localTitle, title])

  return (
    <div className={cn("min-h-svh bg-background p-6", editMode && "pb-24")}>
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        {editMode ? (
          <form
            onSubmit={(e) => {
              e.preventDefault()
              titleForm.handleSubmit()
            }}
            className="w-full max-w-xs"
          >
            <titleForm.Field name="title">
              {(field) => {
                const isInvalid =
                  field.state.meta.isTouched &&
                  field.state.meta.errors.length > 0
                return (
                  <div className="relative">
                    <Input
                      value={field.state.value}
                      onChange={(e) => {
                        field.handleChange(e.target.value)
                        setLocalTitle(e.target.value)
                      }}
                      onBlur={field.handleBlur}
                      className={cn("h-8", savingTitle && "pr-8")}
                      disabled={savingTitle}
                      onKeyDown={(e) => {
                        if (e.key === "Enter") {
                          e.preventDefault()
                          titleForm.handleSubmit()
                        }
                        if (e.key === "Escape") {
                          setLocalTitle(null)
                          setEditMode(false)
                        }
                      }}
                      aria-invalid={isInvalid || undefined}
                      autoFocus
                    />
                    {savingTitle && (
                      <Loader2 className="absolute top-1/2 right-2 size-4 -translate-y-1/2 animate-spin text-muted-foreground" />
                    )}
                  </div>
                )
              }}
            </titleForm.Field>
          </form>
        ) : (
          <h1 className="text-lg font-semibold">{dashboardTitle}</h1>
        )}

        <div className="flex items-center gap-2">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="icon">
                <Palette className="h-4 w-4" />
                <span className="sr-only">Theme settings</span>
              </Button>
            </DropdownMenuTrigger>
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
            !editMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => {
                  setEditMode(true)
                  haptic.trigger("light")
                }}
              >
                Edit
              </Button>
            ) : null
          ) : (
            <Button
              variant="outline"
              size="sm"
              onClick={() => setLoginOpen(true)}
            >
              <LogIn className="mr-1.5 h-3.5 w-3.5" />
              Sign in
            </Button>
          )}
        </div>
      </header>

      {/* Single DndContext handles both group and item reordering */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragStart={handleDragStart}
        onDragOver={handleDragOver}
        onDragEnd={handleDragEnd}
      >
        <SortableContext
          items={localGroups.map((g) => g.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-8">
            {localGroups.map((group) => (
              <GroupCard
                key={group.id}
                group={group}
                editMode={editMode}
                onEditGroup={() => {
                  setEditingGroup(group)
                  setGroupDialogOpen(true)
                }}
                onAddItem={() => {
                  setEditingItem(null)
                  setTargetGroupId(group.id)
                  setItemDialogOpen(true)
                }}
                onGroupsChanged={handleGroupsUpdated}
                onEditItem={(item) => {
                  setEditingItem(item)
                  setTargetGroupId(group.id)
                  setItemDialogOpen(true)
                }}
              />
            ))}
          </div>
        </SortableContext>

        <DragOverlay dropAnimation={null}>
          {activeItem ? (
            <ItemCardDragPreview item={activeItem} />
          ) : activeGroup ? (
            <div className="rounded-xl bg-card px-3 py-2 text-sm font-medium shadow-lg ring-2 ring-ring">
              {activeGroup.name}
            </div>
          ) : null}
        </DragOverlay>
      </DndContext>

      {editMode && (
        <button
          type="button"
          onClick={() => {
            setEditingGroup(null)
            setGroupDialogOpen(true)
          }}
          className="mt-6 flex w-full items-center justify-center gap-2 rounded-xl border-2 border-dashed border-border/50 py-4 text-sm text-muted-foreground transition-colors hover:border-ring hover:text-foreground"
        >
          <Plus className="h-4 w-4" />
          Add Group
        </button>
      )}

      {editMode && isLoggedIn && (
        <EditBar
          onDone={async () => {
            await handleSaveTitle()
            setEditMode(false)
            haptic.trigger("light")
          }}
        />
      )}

      <GroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        group={editingGroup}
        onGroupsChanged={handleGroupsUpdated}
      />
      <ItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        item={editingItem}
        groupId={targetGroupId ?? ""}
        onGroupsChanged={handleGroupsUpdated}
      />
      <Dialog open={loginOpen} onOpenChange={setLoginOpen}>
        <DialogContent className="max-w-sm">
          <DialogHeader>
            <DialogTitle>Sign in</DialogTitle>
          </DialogHeader>
          <LoginForm />
        </DialogContent>
      </Dialog>
    </div>
  )
}
