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
import { EditableStatGrid } from "@/components/dashboard/item/editable-stat-grid";
import { Skeleton } from "@/components/ui/skeleton";
import { AlertCircle } from "lucide-react";
import type { WidgetPayload } from "@/lib/adapters/widget-types";
import { useWidgetDisplay } from "@/components/dashboard/item/widget-display-context";
import { ActiveStreamList, DownloadList } from "./widget-lists-server";

interface WidgetContainerProps {
  payload: WidgetPayload;
}

export function WidgetContainer({ payload }: WidgetContainerProps) {
  const displaySettings = useWidgetDisplay();
  const isEditMode = displaySettings?.editMode ?? false;

  // Show loading skeleton when loading
  if (payload.loading) {
    return (
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {[0, 1, 2, 3].map((i) => (
          <Skeleton
            key={i}
            className={cn("h-16 rounded-xl", "bg-gradient-to-b from-secondary/50 to-secondary/30")}
          />
        ))}
      </div>
    );
  }

  // Show error state
  if (payload.error) {
    return (
      <div
        className={cn(
          "flex flex-col items-center justify-center gap-2",
          "rounded-xl border border-destructive/20",
          "bg-destructive/5 py-4 text-center",
          "px-3",
        )}
      >
        <div
          className={cn(
            "flex h-10 w-10 items-center justify-center rounded-full",
            "bg-destructive/10",
          )}
        >
          <AlertCircle className="h-5 w-5 text-destructive" />
        </div>
        <p className="text-xs font-medium text-destructive/80">{payload.error}</p>
      </div>
    );
  }

  const hasStats = payload.stats.length > 0;
  const hasStreams = payload.streams && payload.streams.length > 0;
  const hasDownloads = payload.downloads && payload.downloads.length > 0;
  const hasCustom = !!payload.customComponent;

  if (!hasStats && !hasStreams && !hasDownloads && !hasCustom) {
    return null;
  }

  // Filter out unused stat cards when not in edit mode
  const unusedIds = new Set(displaySettings?.statCardOrder?.unused ?? []);
  const visibleStats = isEditMode
    ? payload.stats
    : payload.stats.filter((stat) => !unusedIds.has(stat.id));

  return (
    <div className="space-y-2.5">
      {hasStats &&
        (isEditMode ? (
          <EditableStatGrid
            items={payload.stats}
            order={displaySettings?.statCardOrder ?? null}
            onOrderChange={displaySettings?.onOrderChange ?? (() => {})}
            displayMode={displaySettings?.statDisplayMode ?? "label"}
          />
        ) : (
          <WidgetStatGrid items={visibleStats} />
        ))}

      {hasStreams && <ActiveStreamList streams={payload.streams!} />}

      {hasDownloads && <DownloadList downloads={payload.downloads!} />}

      {payload.customComponent}
    </div>
  );
}
