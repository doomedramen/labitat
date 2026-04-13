/**
 * Server-compatible stat card grid.
 * Renders stat cards directly without DnD.
 */

import { StatCard } from "@/components/dashboard/item/stat-card";
import type { StatItem } from "@/components/widgets";

interface WidgetStatGridProps {
  items: StatItem[];
  cols?: number;
}

export function WidgetStatGrid({ items, cols }: WidgetStatGridProps) {
  const gridStyle: React.CSSProperties = {
    gridTemplateColumns: cols ? `repeat(${cols}, 1fr)` : "repeat(auto-fit, minmax(60px, 1fr))",
  };

  return (
    <div className="grid gap-1.5 text-xs" style={gridStyle}>
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
