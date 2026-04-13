/**
 * Server-compatible ResourceBarDual component.
 * Renders a dual resource bar showing used vs free (like memory usage).
 */

import { cn } from "@/lib/utils";
import type { ResourceBarDualProps } from "./types";

export function ResourceBarDual({
  label,
  used,
  total,
  free,
  warningAt = 70,
  criticalAt = 90,
}: ResourceBarDualProps) {
  const pct = Math.min(100, Math.max(0, used ?? 0));
  const isCritical = pct >= criticalAt;
  const isWarning = pct >= warningAt;

  const barColor = isCritical ? "bg-destructive" : isWarning ? "bg-amber-500" : "bg-primary";
  const valueColor = isCritical
    ? "text-destructive"
    : isWarning
      ? "text-amber-500"
      : "text-secondary-foreground";

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline justify-between">
        <span className="text-secondary-foreground/60">{label}</span>
        <span className={cn("font-medium tabular-nums", valueColor)}>
          {pct}% used
          {free && (
            <span className="ml-1.5 font-normal text-secondary-foreground/50">({free} free)</span>
          )}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
      {total && (
        <div className="text-right text-[10px] text-secondary-foreground/40">Total: {total}</div>
      )}
    </div>
  );
}
