"use client"

import { useSyncExternalStore } from "react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { cn } from "@/lib/utils"
import { getService } from "@/lib/adapters"
import type { ItemRow, ItemWithCache } from "@/lib/types"
import { ItemIcon } from "./item-icon"
import { StatusDot } from "./status-dot"
import { WidgetRenderer } from "./widget-renderer"
import { EditModeControls } from "./edit-mode-controls"
import { useItemData } from "@/hooks/use-item-data"

interface ItemCardProps {
  item: ItemWithCache
  editMode: boolean
  onEdit: (item: ItemRow) => void
  onDeleted?: (itemId: string) => void
}

export function ItemCard({ item, editMode, onEdit, onDeleted }: ItemCardProps) {
  const mounted = useSyncExternalStore(
    () => () => {},
    () => true,
    () => false
  )

  const serviceDef = item.serviceType ? getService(item.serviceType) : null
  const pollingMs = item.pollingMs ?? serviceDef?.defaultPollingMs ?? 30_000

  const {
    effectiveData,
    effectiveLoading,
    serviceStatus,
    hasStatus,
    isClientSide,
  } = useItemData({ editMode, item })

  const {
    attributes,
    listeners,
    setNodeRef,
    setActivatorNodeRef,
    transform,
    transition,
    isDragging,
  } = useSortable({
    id: item.id,
    data: { type: "item" },
    disabled: !editMode,
  })

  const style: React.CSSProperties = {
    transform: CSS.Transform.toString(transform),
    transition,
    opacity: isDragging ? 0.35 : undefined,
  }

  const inner = (
    <div
      className={cn(
        "relative",
        item.cleanMode && !editMode ? "p-2" : "px-3 py-2.5"
      )}
      data-testid="item-card"
      data-item-id={item.id}
    >
      {mounted && !editMode && hasStatus && !item.cleanMode && (
        <div className="absolute top-3 right-3">
          <StatusDot status={serviceStatus} />
        </div>
      )}

      {(!item.cleanMode || editMode) && (
        <div className="flex items-center gap-3">
          {editMode && (
            <button
              className="-ml-1 flex-none cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
              aria-label="Drag to reorder item"
            >
              {/* Replaced by EditModeControls */}
            </button>
          )}

          <ItemIcon
            iconUrl={item.iconUrl}
            label={item.label}
            serviceIcon={serviceDef?.icon ?? null}
          />

          <div className="min-w-0 flex-1 pr-4">
            <p className="truncate text-sm leading-snug font-medium">
              {editMode
                ? item.label || serviceDef?.name || item.href
                : item.label}
            </p>
            {editMode && (
              <div className="mt-0.5 flex flex-col text-xs text-muted-foreground">
                {serviceDef && <span>{serviceDef.name}</span>}
                {item.href && <span className="truncate">{item.href}</span>}
                <span>{pollingMs / 1000}s poll</span>
              </div>
            )}
          </div>
        </div>
      )}

      <WidgetRenderer
        serviceDef={serviceDef ?? null}
        effectiveData={effectiveData}
        effectiveLoading={effectiveLoading}
        isClientSide={isClientSide}
        editMode={editMode}
        cleanMode={item.cleanMode ?? undefined}
      />
    </div>
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/item relative overflow-hidden rounded-xl bg-card transition-all duration-300 ease-in-out",
        editMode ? "border border-ring/50" : "border border-border/50",
        !editMode && "transform hover:scale-[1.02] hover:shadow-md",
        !editMode && item.href && "cursor-pointer"
      )}
    >
      {!editMode && item.href ? (
        <a
          href={item.href}
          target="_blank"
          rel="noopener noreferrer"
          className="block"
        >
          {inner}
        </a>
      ) : (
        inner
      )}

      {editMode && (
        <EditModeControls
          item={item}
          onEdit={onEdit}
          onDeleted={onDeleted}
          setActivatorNodeRef={setActivatorNodeRef}
          attributes={attributes}
          listeners={listeners}
        />
      )}
    </div>
  )
}

export function ItemCardDragPreview({ item }: { item: ItemWithCache }) {
  const serviceDef = item.serviceType ? getService(item.serviceType) : null

  return (
    <div className="flex min-h-[3.25rem] items-center gap-3 rounded-xl bg-popover/90 px-3 py-2.5 shadow-lg ring-2 ring-ring backdrop-blur-sm">
      <ItemIcon
        iconUrl={item.iconUrl}
        label={item.label}
        serviceIcon={serviceDef?.icon ?? null}
      />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm leading-snug font-medium">
          {item.label}
        </p>
        {item.serviceType && (
          <p className="truncate text-xs text-muted-foreground">
            {serviceDef?.name || item.serviceType}
          </p>
        )}
      </div>
    </div>
  )
}
