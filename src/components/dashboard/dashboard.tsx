"use client"

import { useEffect, useState } from "react"
import {
  DndContext,
  closestCenter,
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import {
  SortableContext,
  sortableKeyboardCoordinates,
  verticalListSortingStrategy,
} from "@dnd-kit/sortable"
import { Palette, LogIn, Plus } from "lucide-react"
import { toast } from "sonner"

import { cn } from "@/lib/utils"
import type { GroupWithCache, ItemRow } from "@/lib/types"
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
import { reorderGroups } from "@/actions/groups"
import { getItemConfig } from "@/actions/items"
import { updateDashboardTitle } from "@/actions/settings"

interface DashboardProps {
  groups: GroupWithCache[]
  isLoggedIn: boolean
  title: string
}

export function Dashboard({ groups, isLoggedIn, title }: DashboardProps) {
  const [editMode, setEditMode] = useState(false)
  const [localTitle, setLocalTitle] = useState<string | null>(null)
  const [loginOpen, setLoginOpen] = useState(false)
  const [groupDialogOpen, setGroupDialogOpen] = useState(false)
  const [itemDialogOpen, setItemDialogOpen] = useState(false)
  const [editingGroup, setEditingGroup] = useState<GroupWithCache | null>(null)
  const [editingItem, setEditingItem] = useState<ItemRow | null>(null)
  const [targetGroupId, setTargetGroupId] = useState<string | null>(null)
  const [itemConfig, setItemConfig] = useState<Record<string, string>>({})

  useEffect(() => {
    if (editingItem?.id) {
      getItemConfig(editingItem.id).then(setItemConfig)
    }
  }, [editingItem?.id])

  const dashboardTitle = localTitle ?? title

  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates })
  )

  async function handleGroupDragEnd(event: DragEndEvent) {
    const { active, over } = event
    if (!over || active.id === over.id) return

    const oldIndex = groups.findIndex((g) => g.id === active.id)
    const newIndex = groups.findIndex((g) => g.id === over.id)
    const newGroups = [...groups]
    const [moved] = newGroups.splice(oldIndex, 1)
    newGroups.splice(newIndex, 0, moved)

    await reorderGroups(newGroups.map((g) => g.id))
  }

  function handleSaveTitle() {
    if (localTitle && localTitle.trim()) {
      updateDashboardTitle(localTitle.trim()).then(() => {
        setLocalTitle(null)
        toast.success("Dashboard saved")
      })
    }
  }

  return (
    <div className={cn("min-h-svh bg-background p-6", editMode && "pb-24")}>
      {/* Header */}
      <header className="mb-8 flex flex-wrap items-center justify-between gap-3 sm:gap-4">
        {editMode ? (
          <Input
            value={dashboardTitle}
            onChange={(e) => setLocalTitle(e.target.value)}
            className="h-8 w-full max-w-[200px]"
            onKeyDown={(e) => {
              if (e.key === "Enter") handleSaveTitle()
              if (e.key === "Escape") {
                setLocalTitle(null)
                setEditMode(false)
              }
            }}
            autoFocus
          />
        ) : (
          <h1 className="text-lg font-semibold">{dashboardTitle}</h1>
        )}

        <div className="flex items-center gap-2">
          {/* Theme & Palette dropdown */}
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

          {/* Edit / Sign in */}
          {isLoggedIn ? (
            !editMode ? (
              <Button
                variant="outline"
                size="sm"
                onClick={() => setEditMode(true)}
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

      {/* Dashboard body */}
      <DndContext
        sensors={sensors}
        collisionDetection={closestCenter}
        onDragEnd={handleGroupDragEnd}
      >
        <SortableContext
          items={groups.map((g) => g.id)}
          strategy={verticalListSortingStrategy}
        >
          <div className="flex flex-col gap-8">
            {groups.map((group) => (
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
                onEditItem={(item) => {
                  setEditingItem(item)
                  setTargetGroupId(group.id)
                  setItemDialogOpen(true)
                }}
              />
            ))}
          </div>
        </SortableContext>
      </DndContext>

      {/* Add group button in edit mode */}
      {editMode && (
        <button
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

      {/* Edit bar (save/done) */}
      {editMode && isLoggedIn && (
        <EditBar
          onDone={() => {
            handleSaveTitle()
            setEditMode(false)
          }}
        />
      )}

      {/* Dialogs */}
      <GroupDialog
        open={groupDialogOpen}
        onOpenChange={setGroupDialogOpen}
        group={editingGroup}
      />
      <ItemDialog
        open={itemDialogOpen}
        onOpenChange={setItemDialogOpen}
        item={editingItem}
        groupId={targetGroupId ?? ""}
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
