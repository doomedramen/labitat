import { StatCard } from "./stat-card";
import type { StatItem } from "@/components/widgets";
import styles from "./service-card.module.css";
export function WidgetStatGrid({
  items,
  displayMode = "label",
}: {
  items: StatItem[];
  displayMode?: "icon" | "label";
}) {
  return (
    <div className={styles.stats} data-count={items.length}>
      {items.map((item) => (
        <StatCard
          key={item.id}
          {...item}
          tooltip={typeof item.tooltip === "string" ? item.tooltip : undefined}
          displayMode={displayMode}
        />
      ))}
    </div>
  );
}
