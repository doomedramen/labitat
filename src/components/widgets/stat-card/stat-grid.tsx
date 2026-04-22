/**
 * Server-compatible StatGrid component.
 * Renders stat cards in a grid layout.
 * Delegates to StatGridClient when DnD is enabled.
 * Adapts layout based on item count.
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

function getGridClasses(count: number): string {
  switch (count) {
    case 1:
      return "grid-cols-1";
    case 2:
      return "grid-cols-2";
    case 3:
      return "grid-cols-3";
    case 4:
    default:
      return "grid-cols-2 sm:grid-cols-4";
  }
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

  // Server path: no DnD — render directly with adaptive layout
  return (
    <div className={cn("grid gap-1.5 text-xs", getGridClasses(items.length))}>
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
