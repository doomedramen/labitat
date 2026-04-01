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
import { fetchServiceData } from "@/actions/services"
import { pingUrl } from "@/actions/ping"
import type { ItemRow } from "@/lib/types"
import type { ServiceData, ServiceStatus } from "@/lib/adapters/types"
import { dataToStatus } from "@/lib/adapters/types"
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
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

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

// ── Status dot with tooltip ────────────────────────────────────────────────────

const statusColors: Record<ServiceStatus["state"], string> = {
  healthy: "bg-green-500",
  reachable: "bg-amber-400",
  unreachable: "bg-red-500",
  error: "bg-red-500",
  unknown: "bg-gray-400",
}

const statusLabels: Record<ServiceStatus["state"], string> = {
  healthy: "Healthy",
  reachable: "Reachable",
  unreachable: "Unreachable",
  error: "Error",
  unknown: "Unknown",
}

function StatusDot({ status }: { status: ServiceStatus }) {
  const color = statusColors[status.state]
  const label = statusLabels[status.state]
  const reason = "reason" in status ? status.reason : undefined

  const tooltipContent = reason ? `${label}: ${reason}` : label

  return (
    <Tooltip>
      <TooltipTrigger
        render={<span className={cn("block size-2 rounded-full", color)} />}
      />
      <TooltipContent side="top" className="text-xs">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
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
  initialData?: ServiceData
}

export function ItemCard({
  item,
  editMode,
  onEdit,
  initialData,
}: ItemCardProps) {
  const [isPending, startTransition] = useTransition()
  const [serviceData, setServiceData] = useState<ServiceData | null>(
    initialData ?? null
  )
  const [pingStatus, setPingStatus] = useState<ServiceStatus | null>(null)
  const [isLoading, setIsLoading] = useState(!initialData && item.serviceType)

  const serviceDef = item.serviceType ? getService(item.serviceType) : null
  const pollingMs = item.pollingMs ?? serviceDef?.defaultPollingMs ?? 30_000
  const shouldPollService = !editMode && item.serviceType && serviceDef
  const shouldPing = !editMode && !item.serviceType && item.href

  // Compute derived state
  const effectiveData = editMode ? null : (initialData ?? serviceData)
  const effectiveLoading = editMode ? false : !initialData && isLoading

  // Compute status from service data or ping
  const serviceStatus: ServiceStatus = editMode
    ? { state: "unknown" }
    : (pingStatus ??
      (effectiveData ? dataToStatus(effectiveData) : { state: "unknown" }))

  // Poll service data when not in edit mode
  useEffect(() => {
    if (!shouldPollService) return

    const poll = async () => {
      try {
        const data = await fetchServiceData(item.id)
        setServiceData(data)
        setIsLoading(false)
      } catch {
        setServiceData({ _status: "error", _statusText: "Failed to fetch" })
        setIsLoading(false)
      }
    }

    // Initial poll only if no SSR data
    if (!initialData) {
      poll()
    }

    const interval = setInterval(poll, pollingMs)
    return () => clearInterval(interval)
  }, [shouldPollService, item.id, pollingMs, initialData])

  // Ping URL for non-service items
  useEffect(() => {
    if (!shouldPing) return

    const ping = async () => {
      const status = await pingUrl(item.href!)
      setPingStatus(status)
    }

    ping()
    const interval = setInterval(ping, pollingMs)
    return () => clearInterval(interval)
  }, [shouldPing, item.href, pollingMs])

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

  // Don't show widget when in edit mode, no widget exists, or error
  const hasWidget =
    !editMode &&
    Widget &&
    serviceDef &&
    effectiveData &&
    serviceStatus.state !== "error"
  const showSkeleton = !editMode && item.serviceType && effectiveLoading

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
          <StatusDot status={serviceStatus} />
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
        </div>
      </div>
      {/* Widget below or skeleton */}
      {hasWidget && !effectiveLoading && (
        <div className="mt-2">
          <Widget {...effectiveData} />
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
