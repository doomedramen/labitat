/**
 * Standardized widget container that handles layout for all adapters.
 * Adapters provide a WidgetPayload (stats + optional lists),
 * and this component renders them in a consistent structure.
 *
 * Server-compatible: renders stat cards and lists from cached data during SSR.
 * In edit mode: uses EditableStatGrid for drag-to-reorder and unused area.
 */

import { cn } from "@/lib/utils";
import { WidgetStatGrid } from "@/components/dashboard/item/widget-stat-grid";
import type { WidgetPayload } from "@/lib/adapters/widget-types";
import type { StatCardOrder } from "@/hooks/use-stat-card-order";
import type { StatDisplayMode } from "@/lib/types";
import { ActiveStreamList, DownloadList } from "./widget-lists-server";

interface WidgetContainerProps {
  payload: WidgetPayload;
  statDisplayMode?: StatDisplayMode;
  statCardOrder?: StatCardOrder | null;
  editMode?: boolean;
}

export function WidgetContainer({
  payload,
  statDisplayMode = "label",
  statCardOrder = null,
  editMode = false,
}: WidgetContainerProps) {
  const isEditMode = editMode;

  // Show loading skeleton when loading - use div instead of Skeleton for SSR compatibility
  if (payload.loading) {
    return (
      <div className="grid grid-cols-4 gap-2">
        {[0, 1, 2, 3].map((i) => (
          <div
            key={i}
            className={cn(
              "h-16 rounded-xl animate-pulse",
              "bg-gradient-to-b from-secondary/50 to-secondary/30"
            )}
          />
        ))}
      </div>
    );
  }

  // Show error state - don't render during SSR, client will handle
  if (payload.error) {
    return null;
  }

  const hasStats = payload.stats.length > 0;
  const hasStreams = payload.streams && payload.streams.length > 0;
  const hasDownloads = payload.downloads && payload.downloads.length > 0;
  const hasCustom = !!payload.customComponent;

  if (!hasStats && !hasStreams && !hasDownloads && !hasCustom) {
    return null;
  }

  // Filter out unused stat cards when not in edit mode
  const unusedIds = new Set(statCardOrder?.unused ?? []);
  const visibleStats = isEditMode
    ? payload.stats
    : payload.stats.filter((stat) => !unusedIds.has(stat.id));

  return (
    <div className="space-y-2.5">
      {hasStats && !isEditMode && (
        <WidgetStatGrid
          items={visibleStats.map((stat) => ({
            ...stat,
            displayMode: statDisplayMode,
          }))}
        />
      )}

      {/* Edit mode is client-only - EditableStatGrid is rendered by the client component */}

      {hasStreams && <ActiveStreamList streams={payload.streams!} />}

      {hasDownloads && <DownloadList downloads={payload.downloads!} />}

      {payload.customComponent}
    </div>
  );
}
