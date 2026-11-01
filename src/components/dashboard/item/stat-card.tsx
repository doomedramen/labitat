import type { ComponentType } from "react";
import { cn } from "@/lib/utils";
import styles from "./service-card.module.css";
interface StatCardProps {
  id: string;
  value: string | number;
  label: string;
  tooltip?: string;
  valueClassName?: string;
  displayMode?: "icon" | "label";
  icon?: ComponentType<{ className?: string }>;
}
export function StatCard({
  value,
  label,
  tooltip,
  valueClassName,
  displayMode = "label",
  icon: Icon,
}: StatCardProps) {
  return (
    <div className={styles.stat} title={tooltip ?? label}>
      <span className={cn(styles.value, valueClassName)}>{value}</span>
      <span className={styles.statLabel}>
        {displayMode === "icon" && Icon && <Icon className="size-3 shrink-0" />}
        <span className={displayMode === "icon" && Icon ? "sr-only" : undefined}>{label}</span>
      </span>
    </div>
  );
}
