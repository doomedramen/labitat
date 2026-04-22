/**
 * Server-compatible stat card grid.
 * Renders stat cards directly without DnD.
 */

import { cn } from "@/lib/utils";
import { StatCard } from "@/components/dashboard/item/stat-card";
import type { StatItem } from "@/components/widgets";

interface WidgetStatGridProps {
  items: StatItem[];
  cols?: number;
}

export function WidgetStatGrid({ items, cols }: WidgetStatGridProps) {
  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: cols ? `repeat(${cols}, 1fr)` : "repeat(auto-fit, minmax(70px, 1fr))",
  };

  return (
    <div className={cn("grid gap-2", "text-xs")} style={gridStyle}>
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
