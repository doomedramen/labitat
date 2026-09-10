"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  KeyboardSensor,
  PointerSensor,
  useSensor,
  useSensors,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type DragCancelEvent,
} from "@dnd-kit/core";
import { arrayMove, sortableKeyboardCoordinates } from "@dnd-kit/sortable";
import { toast } from "sonner";
import { useWebHaptics } from "web-haptics/react";
import type { GroupWithCache, GroupWithItems, ItemWithCache } from "@/lib/types";
import { Header } from "./header";
import { EditMode } from "./edit-mode";
import { Dialogs } from "./dialogs";
import { EditBar } from "./edit-bar";
import { reorderGroups } from "@/actions/groups";
import { moveItem, reorderItems } from "@/actions/items";
import { updateDashboardTitle } from "@/actions/settings";

interface DashboardClientProps {
  groups: GroupWithCache[];
  authEnabled: boolean;
  title: string;
}

export function DashboardClient({ groups, authEnabled, title }: DashboardClientProps) {
  const haptic = useWebHaptics();
  const router = useRouter();
  const editMode = true;
  const [localTitle, setLocalTitle] = useState<string | null>(null);
  const [loginOpen, setLoginOpen] = useState(false);
  const [groupDialogOpen, setGroupDialogOpen] = useState(false);
  const [itemDialogOpen, setItemDialogOpen] = useState(false);
  const [editingGroup, setEditingGroup] = useState<GroupWithCache | null>(null);
  const [editingItem, setEditingItem] = useState<ItemWithCache | null>(null);
  const [targetGroupId, setTargetGroupId] = useState<string>("");
  const [titleError, setTitleError] = useState<string | null>(null);
  const [titleSaving, setTitleSaving] = useState(false);
  const [donePending, setDonePending] = useState(false);
  const [layoutMutationPending, setLayoutMutationPending] = useState(false);

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

    // Update editingItem if it's currently set and exists in the new groups
    // This ensures the item dialog has the latest data including statCardOrder
    if (editingItem) {
      const updatedItem = enriched.flatMap((g) => g.items).find((i) => i.id === editingItem.id);
      if (updatedItem) {
        setEditingItem(updatedItem);
      }
    }
  }

  // DnD sensors
  const sensors = useSensors(
    useSensor(PointerSensor, { activationConstraint: { distance: 8 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );

  const [activeId, setActiveId] = useState<string | null>(null);
  const dragSnapshotRef = useRef<GroupWithCache[] | null>(null);
  const dragStartGroupIdRef = useRef<string | null>(null);
  const layoutMutationPromiseRef = useRef<Promise<void>>(Promise.resolve());
  const layoutMutationPendingRef = useRef(false);
  const layoutMutationErrorRef = useRef<string | null>(null);

  function cloneGroups(source: GroupWithCache[]): GroupWithCache[] {
    return source.map((group) => ({ ...group, items: [...group.items] }));
  }

  function waitForLayoutCommit() {
    return new Promise<void>((resolve) => {
      requestAnimationFrame(() => requestAnimationFrame(() => resolve()));
    });
  }

  function restoreDragSnapshot() {
    if (dragSnapshotRef.current) setLocalGroups(dragSnapshotRef.current);
    dragSnapshotRef.current = null;
    dragStartGroupIdRef.current = null;
    setActiveId(null);
  }

  function queueLayoutMutation(
    snapshot: GroupWithCache[],
    mutation: () => Promise<GroupWithItems[]>,
    failureMessage: string,
  ) {
    layoutMutationPendingRef.current = true;
    setLayoutMutationPending(true);
    layoutMutationErrorRef.current = null;
    const run = async () => {
      try {
        const updated = await mutation();
        handleGroupsUpdated(updated);
        // Keep the editor locked through the RSC reconciliation and the local
        // optimistic update. This prevents Done from targeting a transient DOM
        // node while a server-action flight response is being applied.
        await waitForLayoutCommit();
      } catch {
        layoutMutationErrorRef.current = failureMessage;
        setLocalGroups(snapshot);
        toast.error(failureMessage);
      } finally {
        layoutMutationPendingRef.current = false;
        setLayoutMutationPending(false);
      }
    };
    const pending = layoutMutationPromiseRef.current.then(run, run);
    layoutMutationPromiseRef.current = pending;
    return pending;
  }

  function findItemGroupId(itemId: string, from = localGroups) {
    return from.find((g) => g.items.some((i) => i.id === itemId))?.id;
  }

  function handleDragStart(event: DragStartEvent) {
    if (layoutMutationPendingRef.current) return;
    const id = event.active.id as string;
    setActiveId(id);
    dragSnapshotRef.current = cloneGroups(localGroups);
    if (event.active.data.current?.type === "item") {
      dragStartGroupIdRef.current = findItemGroupId(id) ?? null;
    }
  }

  function handleDragOver(event: DragOverEvent) {
    if (layoutMutationPendingRef.current || donePending) return;
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
    if (layoutMutationPendingRef.current || donePending) {
      restoreDragSnapshot();
      return;
    }
    const { active, over } = event;
    setActiveId(null);

    if (!over) {
      restoreDragSnapshot();
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
        const snapshot = dragSnapshotRef.current ?? cloneGroups(localGroups);
        setLocalGroups(reordered);
        queueLayoutMutation(
          snapshot,
          () => reorderGroups(reordered.map((g) => g.id)),
          "Failed to reorder groups",
        );
      }
    } else if (type === "item") {
      const currentGroupId = findItemGroupId(activeId);
      if (!currentGroupId) {
        restoreDragSnapshot();
        return;
      }

      const currentGroup = localGroups.find((g) => g.id === currentGroupId)!;
      const activeIdx = currentGroup.items.findIndex((i) => i.id === activeId);
      const overIdx = currentGroup.items.findIndex((i) => i.id === overId);

      let finalItems = currentGroup.items;
      const snapshot = dragSnapshotRef.current ?? cloneGroups(localGroups);
      if (overIdx !== -1 && activeIdx !== overIdx) {
        finalItems = arrayMove(currentGroup.items, activeIdx, overIdx);
        setLocalGroups((prev) =>
          prev.map((g) => (g.id === currentGroupId ? { ...g, items: finalItems } : g)),
        );
      }

      const sourceGroupId = dragStartGroupIdRef.current;
      if (sourceGroupId && sourceGroupId !== currentGroupId) {
        const srcGroup = localGroups.find((g) => g.id === sourceGroupId);
        const destGroup = localGroups.find((g) => g.id === currentGroupId);
        if (srcGroup && destGroup) {
          queueLayoutMutation(
            snapshot,
            () =>
              moveItem(
                activeId,
                sourceGroupId,
                currentGroupId,
                srcGroup.items.map((i) => i.id),
                finalItems.map((i) => i.id),
              ),
            "Failed to move item",
          );
        }
      } else if (overIdx !== -1 && activeIdx !== overIdx) {
        queueLayoutMutation(
          snapshot,
          () =>
            reorderItems(
              currentGroupId,
              finalItems.map((i) => i.id),
            ),
          "Failed to reorder items",
        );
      }
    }

    dragSnapshotRef.current = null;
    dragStartGroupIdRef.current = null;
  }

  function handleDragCancel(_event: DragCancelEvent) {
    restoreDragSnapshot();
  }

  async function handleSaveTitle(): Promise<boolean> {
    const nextTitle = (localTitle ?? title).trim();
    if (!nextTitle) {
      setTitleError("Dashboard title is required.");
      return false;
    }

    if (nextTitle === title.trim()) {
      setTitleError(null);
      return true;
    }

    setTitleSaving(true);
    setTitleError(null);
    try {
      await updateDashboardTitle(nextTitle);
      toast.success("Dashboard saved");
      haptic.trigger("success");
      return true;
    } catch {
      setTitleError("Could not save dashboard title. Your draft is still here; try again.");
      toast.error("Failed to save title");
      haptic.trigger("error");
      return false;
    } finally {
      setTitleSaving(false);
    }
  }

  async function handleDone() {
    if (donePending) return;
    setDonePending(true);
    try {
      if (layoutMutationPendingRef.current) {
        await layoutMutationPromiseRef.current;
        if (layoutMutationErrorRef.current) return;
      }
      const saved = await handleSaveTitle();
      if (!saved) return;
      // Let the title action's Flight response reconcile before changing
      // history, otherwise back/forward can observe a partially applied tree.
      await waitForLayoutCommit();
      router.push("/");
      haptic.trigger("light");
    } finally {
      setDonePending(false);
    }
  }

  return (
    <>
      <Header
        editMode={editMode}
        canEdit
        title={title}
        localTitle={localTitle}
        onTitleChange={setLocalTitle}
        titleError={titleError}
        titleSaving={titleSaving}
        onToggleEditMode={() => router.push("/")}
        onSignInClick={() => setLoginOpen(true)}
      />

      <div className="pb-20">
        <EditMode
          groups={localGroups}
          sensors={sensors}
          activeId={activeId}
          onDragStart={handleDragStart}
          onDragOver={handleDragOver}
          onDragEnd={handleDragEnd}
          onDragCancel={handleDragCancel}
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
      </div>

      {editMode && (
        <EditBar
          showSignOut={authEnabled}
          onDone={handleDone}
          pending={donePending || titleSaving || layoutMutationPending}
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
