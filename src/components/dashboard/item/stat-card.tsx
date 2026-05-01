/**
 * Server-compatible StatCard.
 * Renders label + value during SSR. No icons (Lucide components are client-only).
 */

import { cn } from "@/lib/utils";

interface StatCardProps {
  id: string;
  value: string | number;
  label: string;
  tooltip?: string;
  valueClassName?: string;
  displayMode?: "icon" | "label";
}

export function StatCard({
  value,
  label,
  tooltip,
  // valueClassName,
  displayMode = "label",
}: StatCardProps) {
  const showLabel = displayMode === "label";
  const effectiveTooltip = displayMode === "icon" ? (tooltip ?? label) : undefined;

  return (
    <div
      className={cn(
        "flex h-full flex-col items-center justify-center rounded-md bg-secondary px-2 py-1.5 text-center select-none",
        "transition-all  hover:scale-105 hover:bg-secondary/80 active:scale-95",
      )}
    >
      <span className={cn("font-medium tabular-nums")}>{value}</span>
      {showLabel ? (
        <span className="">{label}</span>
      ) : effectiveTooltip ? (
        <span className="sr-only">{effectiveTooltip}</span>
      ) : null}
    </div>
  );
}
