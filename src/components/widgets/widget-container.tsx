"use client"

/**
 * Standardized widget container that handles layout for all adapters.
 * Adapters provide a WidgetPayload (stats + optional lists),
 * and this component renders them in a consistent structure.
 */

import { WidgetStatGrid } from "@/components/dashboard/item/widget-stat-grid"
import { ActiveStreamList, DownloadList } from "@/components/widgets"
import type { WidgetPayload } from "@/lib/adapters/widget-types"

export function WidgetContainer({ payload }: { payload: WidgetPayload }) {
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

      {hasStreams && <ActiveStreamList streams={payload.streams} />}

      {hasDownloads && <DownloadList downloads={payload.downloads} />}

      {payload.customComponent}
    </div>
  )
}
