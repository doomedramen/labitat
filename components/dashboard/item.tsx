"use client"

import { useTransition, useState, useEffect } from "react"
import {
  GlobeIcon,
  GripVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { deleteItem } from "@/actions/items"
import type { ItemRow } from "@/lib/types"
import type { ServiceData } from "@/lib/adapters/types"
import { getService } from "@/lib/adapters"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
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

// ── Icon ─────────────────────────────────────────────────────────────────────

function ItemIcon({
  iconUrl,
  label,
}: {
  iconUrl: string | null
  label: string
}) {
  const [fallbackToGlobe, setFallbackToGlobe] = useState(false)

  // Show globe icon if no icon URL or loading failed
  if (!iconUrl || fallbackToGlobe) {
    return (
      <div className="flex size-9 flex-none items-center justify-center bg-muted">
        <GlobeIcon className="size-4 text-muted-foreground" />
      </div>
    )
  }

  // Build icon URL - determine format from extension (like Homepage)
  const buildIconUrl = () => {
    // Custom URL
    if (iconUrl.startsWith("http")) {
      return iconUrl
    }

    // selfh.st slug - check if extension is specified
    const slug = iconUrl.toLowerCase()

    if (slug.endsWith(".png")) {
      const iconName = slug.replace(".png", "")
      return `https://cdn.jsdelivr.net/gh/selfhst/icons@main/png/${iconName}.png`
    }

    if (slug.endsWith(".webp")) {
      const iconName = slug.replace(".webp", "")
      return `https://cdn.jsdelivr.net/gh/selfhst/icons@main/webp/${iconName}.webp`
    }

    if (slug.endsWith(".svg")) {
      const iconName = slug.replace(".svg", "")
      return `https://cdn.jsdelivr.net/gh/selfhst/icons@main/svg/${iconName}.svg`
    }

    // No extension - default to PNG (most widely available)
    return `https://cdn.jsdelivr.net/gh/selfhst/icons@main/png/${slug}.png`
  }

  const src = buildIconUrl()

  return (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={label}
      width={36}
      height={36}
      className="size-9 flex-none object-contain"
      onError={() => setFallbackToGlobe(true)}
    />
  )
}

// ── Status dot ────────────────────────────────────────────────────────────────

const statusDotClass: Record<string, string> = {
  ok: "bg-green-500",
  warn: "bg-amber-400",
  error: "bg-red-500",
  loading: "bg-foreground/30 animate-pulse",
}

function StatusDot({ status }: { status: string }) {
  return (
    <span
      className={cn(
        "block size-2 rounded-full",
        statusDotClass[status] ?? "bg-foreground/20"
      )}
    />
  )
}

// ── Skeleton loader ───────────────────────────────────────────────────────────

function WidgetSkeleton() {
  return (
    <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-1.5">
      {[...Array(3)].map((_, i) => (
        <div
          key={i}
          className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1.5"
        >
          <div className="h-4 w-8 animate-pulse rounded bg-muted-foreground/20" />
          <div className="mt-1 h-2.5 w-6 animate-pulse rounded bg-muted-foreground/10" />
        </div>
      ))}
    </div>
  )
}

// ── Item card ─────────────────────────────────────────────────────────────────

type ItemCardProps = {
  item: ItemRow
  editMode: boolean
  onEdit: (item: ItemRow) => void
}

export function ItemCard({ item, editMode, onEdit }: ItemCardProps) {
  const [isPending, startTransition] = useTransition()
  const [serviceData, setServiceData] = useState<ServiceData | null>(null)
  const [dataError, setDataError] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const serviceDef = item.serviceType ? getService(item.serviceType) : null
  const pollingMs = item.pollingMs ?? serviceDef?.defaultPollingMs ?? 10_000

  // Poll service data when not in edit mode
  useEffect(() => {
    if (editMode || !item.serviceType || !serviceDef) {
      setServiceData(null)
      setIsLoading(false)
      return
    }

    let cancelled = false
    const poll = async () => {
      if (cancelled) return
      try {
        const res = await fetch(`/api/services/${item.id}`)
        if (!res.ok) {
          throw new Error(`Failed to fetch: ${res.status}`)
        }
        const data = await res.json()
        if (!cancelled) {
          setServiceData(data)
          setDataError(null)
          setIsLoading(false)
        }
      } catch (err) {
        if (!cancelled) {
          setDataError(
            err instanceof Error ? err.message : "Failed to fetch data"
          )
          setServiceData({ _status: "error" })
          setIsLoading(false)
        }
      }
    }

    poll()
    const interval = setInterval(poll, pollingMs)
    return () => {
      cancelled = true
      clearInterval(interval)
    }
  }, [editMode, item.id, item.serviceType, serviceDef, pollingMs])

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

  const handleDelete = () => startTransition(() => deleteItem(item.id))

  const Widget = serviceDef?.Widget
  const status = serviceData?._status ?? (dataError ? "error" : null)

  const hasWidget = !editMode && Widget && serviceDef && serviceData
  const showSkeleton = !editMode && item.serviceType && isLoading

  const inner = (
    <div
      className={cn(
        "relative px-3",
        hasWidget || showSkeleton ? "py-2.5" : "py-2"
      )}
      data-testid="item-card"
      data-item-id={item.id}
    >
      {/* Status dot - absolute top right */}
      {!editMode && (
        <div className="absolute top-3 right-3">
          <StatusDot status={status ?? "loading"} />
        </div>
      )}
      {/* Main row: drag handle | icon | title */}
      <div className="flex items-center gap-3">
        {/* Drag handle - left side in edit mode */}
        {editMode && (
          <button
            ref={setActivatorNodeRef}
            {...attributes}
            {...listeners}
            className="-ml-1 flex-none cursor-grab touch-none text-muted-foreground/50 hover:text-muted-foreground active:cursor-grabbing"
            aria-label="Drag to reorder item"
          >
            <GripVerticalIcon className="size-4" />
          </button>
        )}
        <ItemIcon iconUrl={item.iconUrl} label={item.label} />
        <div className="min-w-0 flex-1 pr-4">
          <p className="truncate text-sm leading-snug font-medium">
            {item.label}
          </p>
          {/* TODO: description if provided */}
        </div>
      </div>
      {/* Widget below or skeleton */}
      {hasWidget && !isLoading && (
        <div className="mt-2">
          <Widget {...serviceData} />
        </div>
      )}
      {showSkeleton && <WidgetSkeleton />}
    </div>
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/item relative overflow-hidden rounded-xl bg-card ring-1 ring-foreground/10 transition-all",
        editMode
          ? "ring-2 ring-border"
          : item.href &&
              "cursor-pointer hover:shadow-md hover:ring-foreground/20"
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
        <div className="pointer-events-none absolute inset-0 flex items-start justify-end gap-0.5 p-1 opacity-0 transition-opacity group-hover/item:opacity-100">
          <Button
            size="icon-xs"
            variant="ghost"
            className="pointer-events-auto bg-background/70"
            onClick={() => onEdit(item)}
            data-testid="item-edit-button"
          >
            <PencilIcon />
            <span className="sr-only">Edit {item.label}</span>
          </Button>

          <AlertDialog>
            <AlertDialogTrigger
              render={
                <Button
                  size="icon-xs"
                  variant="ghost"
                  className="pointer-events-auto bg-background/70 text-destructive"
                  disabled={isPending}
                  data-testid="item-delete-button"
                />
              }
            >
              <Trash2Icon />
              <span className="sr-only">Delete {item.label}</span>
            </AlertDialogTrigger>
            <AlertDialogContent size="sm">
              <AlertDialogHeader>
                <AlertDialogTitle>
                  Delete &quot;{item.label}&quot;?
                </AlertDialogTitle>
                <AlertDialogDescription>
                  This action cannot be undone.
                </AlertDialogDescription>
              </AlertDialogHeader>
              <AlertDialogFooter>
                <AlertDialogCancel>Cancel</AlertDialogCancel>
                <AlertDialogAction
                  variant="destructive"
                  onClick={handleDelete}
                  disabled={isPending}
                  data-testid="item-delete-confirm"
                >
                  Delete
                </AlertDialogAction>
              </AlertDialogFooter>
            </AlertDialogContent>
          </AlertDialog>
        </div>
      )}
    </div>
  )
}

/** Shown inside DragOverlay while an item is being dragged */
export function ItemCardDragPreview({ item }: { item: ItemRow }) {
  return (
    <div className="flex min-h-[3.25rem] items-center gap-3 rounded-xl bg-background/90 px-3 py-2.5 shadow-lg ring-2 ring-primary/30 backdrop-blur-sm">
      <ItemIcon iconUrl={item.iconUrl} label={item.label} />
      <div className="min-w-0 flex-1">
        <p className="truncate text-sm leading-snug font-medium">
          {item.label}
        </p>
        {item.serviceType && (
          <p className="truncate text-xs text-muted-foreground">
            {item.serviceType}
          </p>
        )}
      </div>
    </div>
  )
}
