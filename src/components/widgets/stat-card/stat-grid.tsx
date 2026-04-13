/**
 * Server-compatible StatGrid component.
 * Renders stat cards in a grid layout.
 * Delegates to StatGridClient when DnD is enabled.
 */

import { StatCard } from "./stat-card";
import { StatGridClient } from "./stat-grid-client";
import type { StatItem } from "./types";
import type { StatDisplayMode } from "@/lib/types";

interface StatGridProps {
  items: StatItem[];
  cols?: number;
  displayMode?: StatDisplayMode;
  sortable?: boolean;
  editMode?: boolean;
  onReorder?: (activeId: string, overId: string) => void;
}

export function StatGrid({
  items,
  cols,
  displayMode = "label",
  sortable = false,
  editMode = false,
  onReorder,
}: StatGridProps) {
  const dndEnabled = sortable && editMode && items.length > 1;

  if (items.length === 0) return null;

  // Client path: DnD enabled — delegate to client component
  if (dndEnabled) {
    return (
      <StatGridClient items={items} cols={cols} displayMode={displayMode} onReorder={onReorder} />
    );
  }

  // Server path: no DnD — render directly
  return (
    <div
      className="grid gap-1.5 text-xs"
      style={{
        gridTemplateColumns: cols ? `repeat(${cols}, 1fr)` : "repeat(auto-fit, minmax(60px, 1fr))",
      }}
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
