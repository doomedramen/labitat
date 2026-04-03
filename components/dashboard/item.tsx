"use client"

import { useTransition, useState } from "react"
import {
  GlobeIcon,
  GripVerticalIcon,
  PencilIcon,
  Trash2Icon,
} from "lucide-react"
import { Skeleton } from "@/components/ui/skeleton"
import { useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { deleteItem } from "@/actions/items"
import { getWidgetData } from "@/actions/widget-data"
import { pingUrl } from "@/actions/ping"
import type { ItemRow } from "@/lib/types"
import type { ServiceData, ServiceStatus } from "@/lib/adapters/types"
import { dataToStatus } from "@/lib/adapters/types"
import { getService } from "@/lib/adapters"
import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import useSWR from "swr"
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
  href,
}: {
  iconUrl: string | null
  label: string
  href?: string | null
}) {
  const [fallbackToGlobe, setFallbackToGlobe] = useState(false)

  // Explicitly disabled
  if (iconUrl === "none") return null

  // Auto-detect favicon from href when no custom icon is set
  const faviconUrl =
    !iconUrl && href
      ? (() => {
          try {
            return new URL(href).origin + "/favicon.ico"
          } catch {
            return null
          }
        })()
      : null

  const effectiveUrl = iconUrl || faviconUrl

  // Show globe icon if nothing to show or loading failed
  if (!effectiveUrl || fallbackToGlobe) {
    return (
      <div className="flex size-9 flex-none items-center justify-center bg-muted">
        <GlobeIcon className="size-4 text-muted-foreground" />
      </div>
    )
  }

  // Build icon URL - determine format from extension (like Homepage)
  const buildIconUrl = () => {
    // Custom or auto-detected URL
    if (effectiveUrl.startsWith("http")) {
      return effectiveUrl
    }

    // selfh.st slug - check if extension is specified
    const slug = effectiveUrl.toLowerCase()

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
  healthy: "bg-chart-3",
  reachable: "bg-muted-foreground/50",
  unreachable: "bg-destructive",
  error: "bg-destructive",
  unknown: "bg-muted-foreground/50",
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

// ── Item card ─────────────────────────────────────────────────────────────────

type ItemCardProps = {
  item: ItemRow
  editMode: boolean
  onEdit: (item: ItemRow) => void
  onDeleted?: (itemId: string) => void
}

export function ItemCard({ item, editMode, onEdit, onDeleted }: ItemCardProps) {
  const [isPending, startTransition] = useTransition()

  const serviceDef = item.serviceType ? getService(item.serviceType) : null
  const pollingMs = item.pollingMs ?? serviceDef?.defaultPollingMs ?? 30_000
  const isClientSide = serviceDef?.clientSide

  // Determine what to fetch
  const shouldFetchService = !editMode && item.serviceType && serviceDef
  const shouldPing = !editMode && !item.serviceType && item.href

  // Use SWR for service data fetching (keeps API keys on server)
  const {
    data: serviceData,
    isLoading: isServiceLoading,
    error: serviceError,
  } = useSWR<ServiceData | null>(
    shouldFetchService && !isClientSide ? `widget:${item.id}` : null,
    () => getWidgetData(item.id),
    {
      refreshInterval: pollingMs,
      dedupingInterval: pollingMs,
      revalidateOnFocus: false,
      revalidateIfStale: true,
      onErrorRetry: (error, key, config, revalidate, { retryCount }) => {
        // Only retry up to 3 times, then wait longer
        if (retryCount >= 3) return
        setTimeout(() => revalidate({ retryCount }), pollingMs)
      },
    }
  )

  // Use SWR for ping data
  const { data: pingStatus, isLoading: isPingLoading } =
    useSWR<ServiceStatus | null>(
      shouldPing ? `ping:${item.id}:${item.href}` : null,
      () => pingUrl(item.href!),
      {
        refreshInterval: pollingMs,
        dedupingInterval: pollingMs,
        revalidateOnFocus: false,
        revalidateIfStale: true,
      }
    )

  // Compute derived state
  const effectiveData = editMode ? null : serviceData
  const effectiveLoading = editMode
    ? false
    : shouldFetchService && !isClientSide
      ? isServiceLoading
      : shouldPing
        ? isPingLoading
        : false

  // Compute status from service data or ping
  // Only show status if item has href (for ping)
  const hasStatus = !!item.href
  const serviceStatus: ServiceStatus = editMode
    ? { state: "unknown" }
    : serviceError
      ? { state: "error", reason: serviceError.message || "Failed to fetch" }
      : pingStatus
        ? pingStatus
        : effectiveData
          ? dataToStatus(effectiveData)
          : { state: "unknown" }

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

  const handleDelete = () => {
    onDeleted?.(item.id)
    startTransition(() => deleteItem(item.id))
  }

  const Widget = serviceDef?.Widget

  // For client-side widgets, always render the Widget (it handles its own state)
  // For server-side widgets, only render if we have data
  const hasWidget =
    !editMode &&
    Widget &&
    serviceDef &&
    (isClientSide || (effectiveData && serviceStatus.state !== "error"))
  const showWidgetSkeleton =
    !editMode && !!item.serviceType && effectiveLoading && !isClientSide

  // For client-side widgets, pass the initial config data
  const widgetProps =
    isClientSide && serviceDef
      ? {
          ...effectiveData,
          config: serviceDef.configFields.reduce(
            (acc, field) => {
              if (effectiveData?.[field.key] !== undefined) {
                acc[field.key] = effectiveData[field.key]
              }
              return acc
            },
            {} as Record<string, unknown>
          ),
        }
      : effectiveData

  const inner = (
    <div
      className={cn(
        "relative px-3 transition-all duration-200 ease-in-out",
        hasWidget ? "py-2.5" : "py-2"
      )}
      data-testid="item-card"
      data-item-id={item.id}
    >
      {/* Status dot - absolute top right - only show if item has href or service with fetchData */}
      {!editMode && hasStatus && (
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
        <ItemIcon iconUrl={item.iconUrl} label={item.label} href={item.href} />
        <div className="min-w-0 flex-1 pr-4">
          <p className="truncate text-sm leading-snug font-medium">
            {item.label || serviceDef?.name || item.href}
          </p>
        </div>
      </div>
      {/* Widget below or loading skeleton */}
      {showWidgetSkeleton && (
        <div className="mt-2 grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-1.5">
          {[0, 1, 2].map((i) => (
            <Skeleton key={i} className="h-[52px] rounded-md" />
          ))}
        </div>
      )}
      {hasWidget && !effectiveLoading && (
        <div className="mt-2">
          <Widget {...widgetProps} />
        </div>
      )}
    </div>
  )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={cn(
        "group/item relative overflow-hidden rounded-xl bg-card transition-all duration-200 ease-in-out",
        editMode
          ? "border border-ring/50"
          : "border border-transparent hover:border-ring/50",
        item.href && !editMode && "cursor-pointer hover:shadow-md"
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
            className="pointer-events-auto bg-popover/80"
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
                  className="pointer-events-auto bg-popover/80 text-destructive"
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
    <div className="flex min-h-[3.25rem] items-center gap-3 rounded-xl bg-popover/90 px-3 py-2.5 shadow-lg ring-2 ring-ring backdrop-blur-sm">
      <ItemIcon iconUrl={item.iconUrl} label={item.label} href={item.href} />
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
