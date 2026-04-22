/**
 * Server-compatible stat card grid.
 * Renders stat cards directly without DnD.
 * Enforces 2x2 or 4-per-row layout to prevent orphans.
 */

import { cn } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/item/stat-card";
import type { StatItem } from "@/components/widgets";

interface WidgetStatGridProps {
  items: StatItem[];
}

export function WidgetStatGrid({ items }: WidgetStatGridProps) {
  return (
    <div
      className={cn(
        "grid gap-2 text-xs",
        // Mobile: 2 columns (2x2 layout for 4 items)
        // Desktop: 4 columns (4 per row)
        "grid-cols-2 sm:grid-cols-4",
      )}
    >
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
