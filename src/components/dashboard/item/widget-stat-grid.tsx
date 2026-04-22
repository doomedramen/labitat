/**
 * Server-compatible stat card grid.
 * Renders stat cards directly without DnD.
 * Adapts layout based on item count to prevent awkward gaps.
 */

import { cn } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/item/stat-card";
import type { StatItem } from "@/components/widgets";

interface WidgetStatGridProps {
  items: StatItem[];
}

function getGridClasses(count: number): string {
  switch (count) {
    case 1:
      return "grid-cols-1";
    case 2:
      return "grid-cols-2";
    case 3:
      // 3 items: fill width evenly (33% each)
      return "grid-cols-3";
    case 4:
    default:
      // 4+ items: 2x2 on mobile, 4 across on desktop
      return "grid-cols-2 sm:grid-cols-4";
  }
}

export function WidgetStatGrid({ items }: WidgetStatGridProps) {
  return (
    <div className={cn("grid gap-2 text-xs", getGridClasses(items.length))}>
      {items.map((item) => (
        <StatCard
          key={item.id}
          id={item.id}
          value={item.value}
          label={item.label}
          tooltip={typeof item.tooltip === "string" ? item.tooltip : undefined}
          valueClassName={item.valueClassName}
          displayMode="label"
        />
      ))}
    </div>
  );
}
