/**
 * Server-compatible StatGrid component.
 * Renders stat cards in a grid layout.
 * Delegates to StatGridClient when DnD is enabled.
 * Enforces 2x2 or 4-per-row layout to prevent orphans.
 */

import { cn } from "@/lib/utils";
import { StatCard } from "./stat-card";
import { StatGridClient } from "./stat-grid-client";
import type { StatItem } from "./types";
import type { StatDisplayMode } from "@/lib/types";

interface StatGridProps {
  items: StatItem[];
  displayMode?: StatDisplayMode;
  sortable?: boolean;
  editMode?: boolean;
  onReorder?: (activeId: string, overId: string) => void;
}

export function StatGrid({
  items,
  displayMode = "label",
  sortable = false,
  editMode = false,
  onReorder,
}: StatGridProps) {
  const dndEnabled = sortable && editMode && items.length > 1;

  if (items.length === 0) return null;

  // Client path: DnD enabled — delegate to client component
  if (dndEnabled) {
    return <StatGridClient items={items} displayMode={displayMode} onReorder={onReorder} />;
  }

  // Server path: no DnD — render directly with fixed 2x2 or 4-col layout
  return (
    <div
      className={cn(
        "grid gap-1.5 text-xs",
        // Mobile: 2 columns, Desktop: 4 columns
        "grid-cols-2 sm:grid-cols-4",
      )}
    >
      {items.map((item) => (
        <StatCard
          key={item.id}
          {...item}
          displayMode={displayMode}
          sortable={false}
          editMode={editMode}
        />
      ))}
    </div>
  );
}
