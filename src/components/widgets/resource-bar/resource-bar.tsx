/**
 * Server-compatible ResourceBar component.
 * Renders a single resource usage bar with label and value.
 */

import { cn } from "@/lib/utils";
import type { ResourceBarProps } from "./types";

export function ResourceBar({
  label,
  value,
  hint,
  warningAt = 70,
  criticalAt = 90,
}: ResourceBarProps) {
  const pct = Math.min(100, Math.max(0, value ?? 0));
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
          {pct}%
          {hint && <span className="ml-1.5 font-normal text-secondary-foreground/50">{hint}</span>}
        </span>
      </div>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-secondary">
        <div
          className={cn("h-full rounded-full transition-all duration-500", barColor)}
          style={{ width: `${pct}%` }}
        />
      </div>
    </div>
  );
}
