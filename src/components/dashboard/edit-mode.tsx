"use client";

import {
  DndContext,
  DragOverlay,
  closestCenter,
  type DragStartEvent,
  type DragOverEvent,
  type DragEndEvent,
  type SensorDescriptor,
} from "@dnd-kit/core";
import { SortableContext, verticalListSortingStrategy } from "@dnd-kit/sortable";
import type { GroupWithCache, GroupWithItems, ItemWithCache } from "@/lib/types";
import { GroupCardDummy } from "./group-dummy";
import { ItemCardDragPreview } from "./item/item-card-drag-preview";

interface EditModeProps {
  groups: GroupWithCache[];
  sensors: SensorDescriptor<any>[];
  activeId: string | null;
  onDragStart: (event: DragStartEvent) => void;
  onDragOver: (event: DragOverEvent) => void;
  onDragEnd: (event: DragEndEvent) => void;
  onEditGroup: (group: GroupWithCache) => void;
  onAddItem: (groupId: string) => void;
  onEditItem: (item: ItemWithCache) => void;
  onGroupsChanged: (groups: GroupWithItems[]) => void;
  onAddGroup: () => void;
}

export function EditMode({
  groups,
  sensors,
  activeId,
  onDragStart,
  onDragOver,
  onDragEnd,
  onEditGroup,
  onAddItem,
  onEditItem,
  onGroupsChanged,
  onAddGroup,
}: EditModeProps) {
  const activeItem = activeId
    ? (groups.flatMap((g) => g.items).find((i) => i.id === activeId) ?? null)
    : null;
  const activeGroup = !activeItem ? (groups.find((g) => g.id === activeId) ?? null) : null;

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={closestCenter}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDragEnd={onDragEnd}
    >
      <SortableContext items={groups.map((g) => g.id)} strategy={verticalListSortingStrategy}>
        <div className="flex flex-col gap-6 sm:gap-8">
          {groups.map((group) => (
            <GroupCardDummy
              key={group.id}
              group={group}
              editMode={true}
              onEditGroup={() => onEditGroup(group)}
              onAddItem={() => onAddItem(group.id)}
              onEditItem={onEditItem}
              onGroupsChanged={onGroupsChanged}
            />
          ))}
          <button
            type="button"
            onClick={onAddGroup}
            className="flex w-full items-center justify-center gap-2 rounded-2xl border border-dashed border-border/70 bg-card/20 py-5 text-sm font-medium text-muted-foreground transition-[border-color,background-color,color] duration-200 hover:border-ring hover:bg-muted/40 hover:text-foreground"
          >
            <span className="text-lg leading-none">+</span>
            Add group
          </button>
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
  );
}
