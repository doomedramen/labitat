"use client"

/**
 * Standardized widget container that handles layout for all adapters.
 * Adapters provide a WidgetPayload (stats + optional lists),
 * and this component renders them in a consistent structure.
 */

import { WidgetStatGrid } from "@/components/dashboard/item/widget-stat-grid"
import { ActiveStreamList, DownloadList } from "@/components/widgets"
import { Skeleton } from "@/components/ui/skeleton"
import { AlertCircle, RefreshCw } from "lucide-react"
import type { WidgetPayload } from "@/lib/adapters/widget-types"

interface WidgetContainerProps {
  payload: WidgetPayload
  onRetry?: () => void
}

export function WidgetContainer({ payload, onRetry }: WidgetContainerProps) {
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
        {onRetry && (
          <button
            type="button"
            onClick={onRetry}
            className="flex items-center gap-1 rounded-md bg-destructive/10 px-2 py-1 text-xs text-destructive hover:bg-destructive/20"
          >
            <RefreshCw className="h-3 w-3" />
            Retry
          </button>
        )}
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
      {hasStats && <WidgetStatGrid items={payload.stats} />}

      {hasStreams && <ActiveStreamList streams={payload.streams!} />}

      {hasDownloads && <DownloadList downloads={payload.downloads!} />}

      {payload.customComponent}
    </div>
  )
}
