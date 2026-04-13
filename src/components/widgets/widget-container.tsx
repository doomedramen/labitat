/**
 * Standardized widget container that handles layout for all adapters.
 * Adapters provide a WidgetPayload (stats + optional lists),
 * and this component renders them in a consistent structure.
 *
 * Server-compatible: renders stat cards and lists from cached data during SSR.
 * In edit mode: uses EditableStatGrid for drag-to-reorder and unused area.
 */

import { WidgetStatGrid } from "@/components/dashboard/item/widget-stat-grid"
import { EditableStatGrid } from "@/components/dashboard/item/editable-stat-grid"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle } from "lucide-react"
import type { WidgetPayload } from "@/lib/adapters/widget-types"
import { useWidgetDisplay } from "@/components/dashboard/item/widget-display-context"

interface WidgetContainerProps {
  payload: WidgetPayload
}

export function WidgetContainer({ payload }: WidgetContainerProps) {
  const displaySettings = useWidgetDisplay()
  const isEditMode = displaySettings?.editMode ?? false

  // Show loading skeleton when loading
  if (payload.loading) {
    return (
      <div className="grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-1.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-[52px] rounded-md" />
        ))}
      </div>
    )
  }

  // Show error state
  if (payload.error) {
    return (
      <div className="flex flex-col items-center justify-center gap-2 rounded-lg border border-destructive/20 bg-destructive/5 py-4 text-center">
        <AlertCircle className="h-5 w-5 text-destructive" />
        <p className="text-xs text-destructive">{payload.error}</p>
      </div>
    )
  }

  const hasStats = payload.stats.length > 0
  const hasStreams = payload.streams && payload.streams.length > 0
  const hasDownloads = payload.downloads && payload.downloads.length > 0
  const hasCustom = !!payload.customComponent

  if (!hasStats && !hasStreams && !hasDownloads && !hasCustom) {
    return null
  }

  return (
    <div className="space-y-2">
      {hasStats &&
        (isEditMode ? (
          <EditableStatGrid
            items={payload.stats}
            order={displaySettings?.statCardOrder ?? null}
            onOrderChange={displaySettings?.onOrderChange ?? (() => {})}
            displayMode={displaySettings?.statDisplayMode ?? "label"}
          />
        ) : (
          <WidgetStatGrid items={payload.stats} />
        ))}

      {hasStreams && <ActiveStreamList streams={payload.streams!} />}

      {hasDownloads && <DownloadList downloads={payload.downloads!} />}

      {payload.customComponent}
    </div>
  )
}

// Minimal server-compatible versions of stream/download lists
// These are simple renders — full interactivity comes from client hydration
function ActiveStreamList({ streams }: { streams: unknown[] }) {
  if (!streams.length) return null
  return (
    <div className="text-xs text-muted-foreground">
      {streams.length} active stream{streams.length !== 1 ? "s" : ""}
    </div>
  )
}

function DownloadList({ downloads }: { downloads: unknown[] }) {
  if (!downloads.length) return null
  return (
    <div className="text-xs text-muted-foreground">
      {downloads.length} download{downloads.length !== 1 ? "s" : ""}
    </div>
  )
}
