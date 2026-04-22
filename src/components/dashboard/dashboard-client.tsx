"use client";

import { useEffect, useState } from "react";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";
import type { GroupWithCache, GroupWithItems, ItemWithCache } from "@/lib/types";
import { useBackground } from "@/hooks/use-background";
import { Header } from "./header";
import { EditMode } from "./edit-mode";
import { ViewMode } from "./view-mode";
import { Dialogs } from "./dialogs";
import { EditBar } from "./edit-bar";
import { reorderGroups } from "@/actions/groups";
import { reorderItems } from "@/actions/items";
import { updateDashboardTitle } from "@/actions/settings";

interface DashboardClientProps {
  groups: GroupWithCache[];
  isLoggedIn: boolean;
  title: string;
}

export function DashboardClient({ groups, isLoggedIn, title }: DashboardClientProps) {
  const haptic = useWebHaptics();
  useBackground();

  const [editMode, setEditMode] = useState(false);
  const [localTitle, setLocalTitle] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupWithCache | null>(null);
  const [editingItem, setEditingItem] = useState<ItemWithCache | null>(null);
  const [targetGroupId, setTargetGroupId] = useState<string>("");

  // Optimistic state for DnD
  const [localGroups, setLocalGroups] = useState<GroupWithCache[]>(groups);
  useEffect(() => {
    setLocalGroups(groups);
  }, [groups]);

  function handleGroupsUpdated(newGroups: GroupWithItems[]) {
    const cacheMap = new Map<
      string,
      {
        widgetData: ItemWithCache["cachedWidgetData"];
        pingStatus: ItemWithCache["cachedPingStatus"];
      }
    >();
    for (const g of localGroups) {
      for (const item of g.items) {
        cacheMap.set(item.id, {
          widgetData: item.cachedWidgetData,
          pingStatus: item.cachedPingStatus,
        });
      }
    }
    const enriched: GroupWithCache[] = newGroups.map((group) => ({
      ...group,
      items: group.items.map((item) => {
        const cached = cacheMap.get(item.id);
        return {
          ...item,
          cachedWidgetData: cached?.widgetData ?? null,
          cachedPingStatus: cached?.pingStatus ?? null,
        } as ItemWithCache;
      }),
    }));
    setLocalGroups(enriched);
  }

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const [dragStartGroupId, setDragStartGroupId] = useState<string | null>(null);

  function findItemGroupId(itemId: string, from = localGroups) {
    return from.find((g) => g.items.some((i) => i.id === itemId))?.id;
  }

  function handleDragStart(event: DragStartEvent) {
    const id = event.active.id as string;
    setActiveId(id);
    if (event.active.data.current?.type === "item") {
      setDragStartGroupId(findItemGroupId(id) ?? null);
    }
  }

  function handleDragOver(event: DragOverEvent) {
    const { active, over } = event;
    if (!over || active.data.current?.type !== "item") return;

    const activeId = active.id as string;
    const overId = over.id as string;

    const activeGroupId = findItemGroupId(activeId);
    const overGroupId =
      findItemGroupId(overId) ?? (localGroups.some((g) => g.id === overId) ? overId : undefined);

    if (!activeGroupId || !overGroupId || activeGroupId === overGroupId) return;

    setLocalGroups((prev) => {
      const srcGroup = prev.find((g) => g.id === activeGroupId)!;
      const item = srcGroup.items.find((i) => i.id === activeId)!;
      return prev.map((g) => {
        if (g.id === activeGroupId)
          return { ...g, items: g.items.filter((i) => i.id !== activeId) };
        if (g.id === overGroupId) return { ...g, items: [...g.items, item] };
        return g;
      });
    });
  }

  function handleDragEnd(event: DragEndEvent) {
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      setLocalGroups(groups);
      setDragStartGroupId(null);
      return;
    }

    haptic.trigger("medium");

    const activeId = active.id as string;
    const overId = over.id as string;
    const type = active.data.current?.type;

    if (type === "group") {
      const oldIndex = localGroups.findIndex((g) => g.id === activeId);
      const newIndex = localGroups.findIndex((g) => g.id === overId);
      if (oldIndex !== newIndex) {
        const reordered = arrayMove(localGroups, oldIndex, newIndex);
        const snapshot = localGroups;
        setLocalGroups(reordered);
        reorderGroups(reordered.map((g) => g.id)).catch(() => {
          setLocalGroups(snapshot);
          toast.error("Failed to reorder groups");
        });
      }
    } else if (type === "item") {
      const currentGroupId = findItemGroupId(activeId);
      if (!currentGroupId) {
        setDragStartGroupId(null);
        return;
      }

      const currentGroup = localGroups.find((g) => g.id === currentGroupId)!;
      const activeIdx = currentGroup.items.findIndex((i) => i.id === activeId);
      const overIdx = currentGroup.items.findIndex((i) => i.id === overId);

      let finalItems = currentGroup.items;
      if (overIdx !== -1 && activeIdx !== overIdx) {
        finalItems = arrayMove(currentGroup.items, activeIdx, overIdx);
        const snapshot = localGroups;
        setLocalGroups((prev) =>
          prev.map((g) => (g.id === currentGroupId ? { ...g, items: finalItems } : g)),
        );
        reorderItems(
          currentGroupId,
          finalItems.map((i) => i.id),
        ).catch(() => {
          setLocalGroups(snapshot);
          toast.error("Failed to reorder items");
        });
      } else {
        reorderItems(
          currentGroupId,
          finalItems.map((i) => i.id),
        ).catch(() => {
          toast.error("Failed to save item order");
        });
      }

      if (dragStartGroupId && dragStartGroupId !== currentGroupId) {
        const srcGroup = localGroups.find((g) => g.id === dragStartGroupId);
        if (srcGroup)
          reorderItems(
            dragStartGroupId,
            srcGroup.items.map((i) => i.id),
          );
      }
    }

    setDragStartGroupId(null);
  }

  async function handleSaveTitle() {
    if (localTitle && localTitle.trim()) {
      try {
        await updateDashboardTitle(localTitle.trim());
        toast.success("Dashboard saved");
        haptic.trigger("success");
      } catch {
        toast.error("Failed to save title");
        haptic.trigger("error");
      }
    }
  }

  return (
    <>
      <Header
        editMode={editMode}
        isLoggedIn={isLoggedIn}
        title={title}
        localTitle={localTitle}
        onTitleChange={setLocalTitle}
        onToggleEditMode={() => setEditMode((v) => !v)}
        onSignInClick={() => setLoginOpen(true)}
      />

      <div className={editMode ? "pb-20" : undefined}>
        {editMode ? (
          <EditMode
            groups={localGroups}
            sensors={sensors}
            activeId={activeId}
            onDragStart={handleDragStart}
            onDragOver={handleDragOver}
            onDragEnd={handleDragEnd}
            onGroupsChanged={handleGroupsUpdated}
            onEditGroup={(group) => {
              setEditingGroup(group);
              setGroupDialogOpen(true);
            }}
            onAddItem={(groupId) => {
              setEditingItem(null);
              setTargetGroupId(groupId);
              setItemDialogOpen(true);
            }}
            onEditItem={(item) => {
              setEditingItem(item);
              setTargetGroupId(findItemGroupId(item.id) ?? "");
              setItemDialogOpen(true);
            }}
            onAddGroup={() => {
              setEditingGroup(null);
              setGroupDialogOpen(true);
            }}
          />
        ) : (
          <ViewMode groups={localGroups} />
        )}
      </div>

      {editMode && isLoggedIn && (
        <EditBar
          onDone={async () => {
            await handleSaveTitle();
            setEditMode(false);
            haptic.trigger("light");
          }}
        />
      )}

      <Dialogs
        loginOpen={loginOpen}
        onLoginOpenChange={setLoginOpen}
        groupDialogOpen={groupDialogOpen}
        onGroupDialogOpenChange={setGroupDialogOpen}
        itemDialogOpen={itemDialogOpen}
        onItemDialogOpenChange={setItemDialogOpen}
        editingGroup={editingGroup}
        editingItem={editingItem}
        targetGroupId={targetGroupId}
        onGroupsChanged={handleGroupsUpdated}
      />
    </>
  );
}
