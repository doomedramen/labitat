"use client";

import { cn } from "@/lib/utils";
import type { ServiceStatus } from "@/lib/adapters/types";
import { StatusDotClient } from "./status-dot-client";
import { useSyncProgress } from "@/hooks/use-sync-progress";

interface StatusDotProps {
  itemId: string;
  status: ServiceStatus;
  cached?: boolean;
  pollingMs: number;
}

/**
 * StatusDot - shared status indicator that wraps with HoverCard when tooltip is needed.
 * Renders just the dot for simple statuses, wraps with HoverCard for error/degraded/slow states.
 * Includes a circular progress ring showing time until next sync.
 */
export function StatusDot({ itemId, status, cached = false, pollingMs }: StatusDotProps) {
  const syncProgress = useSyncProgress(itemId, pollingMs);
  const colors = {
    unknown: "bg-muted-foreground/30",
    healthy: "bg-success",
    degraded: "bg-warning",
    reachable: "bg-success",
    unreachable: "bg-error",
    slow: "bg-warning",
    error: "bg-error",
  };

  const glowColors = {
    unknown: "",
    healthy: "shadow-[0_0_8px_-2px_hsl(var(--success)/0.6)]",
    degraded: "shadow-[0_0_8px_-2px_hsl(var(--warning)/0.6)]",
    reachable: "shadow-[0_0_8px_-2px_hsl(var(--success)/0.6)]",
    unreachable: "shadow-[0_0_10px_-2px_hsl(var(--error)/0.7)]",
    slow: "shadow-[0_0_8px_-2px_hsl(var(--warning)/0.6)]",
    error: "shadow-[0_0_10px_-2px_hsl(var(--error)/0.7)]",
  };

  const labels = {
    unknown: "Status unknown",
    healthy: "Healthy",
    degraded: "Degraded",
    reachable: "Reachable",
    unreachable: "Unreachable",
    slow: "Slow response",
    error: "Error",
  };

  const reason =
    status.state === "unreachable" || status.state === "error"
      ? status.reason
      : status.state === "slow"
        ? `${status.reason} (${status.timeoutMs} ms)`
        : status.state === "degraded"
          ? status.reason
          : undefined;

  const isProblematic =
    status.state === "unreachable" ||
    status.state === "error" ||
    status.state === "degraded" ||
    status.state === "slow";

  const isHealthy = status.state === "healthy" || status.state === "reachable";

  const ariaLabel = `${labels[status.state]}${reason ? `: ${reason}` : ""}${cached ? " (cached)" : ""}`;

  // Calculate SVG ring properties
  // ViewBox is 16x16, center at 8,8
  // Ring is 2px thick, with 2px gap from center dot
  // Center dot is 8px diameter (4px radius)
  // Ring outer radius = 4 + 2 (gap) + 1 (half stroke) = 7px, but we want 2px stroke centered
  // So ring radius = 6px (centered at 6px from center), stroke 2px spans 5-7px
  const radius = 6;
  const circumference = 2 * Math.PI * radius;
  const strokeDashoffset = circumference - (syncProgress / 100) * circumference;

  const dot = (
    <div
      role="status"
      aria-label={ariaLabel}
      className={cn(
        // Base styles - 16x16 container
        "relative h-4 w-4 flex items-center justify-center transition-all duration-300",
      )}
    >
      {/* Circular progress ring - dashed when cached */}
      <svg viewBox="0 0 16 16" className="absolute inset-0 size-full -rotate-90" aria-hidden>
        <circle
          cx="8"
          cy="8"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          className={cn(colors[status.state])}
          style={{
            strokeDasharray: cached
              ? `${circumference * 0.15} ${circumference * 0.1}`
              : circumference,
            strokeDashoffset: strokeDashoffset,
            transition: cached ? undefined : "stroke-dashoffset 0.1s linear",
            opacity: cached ? 0.35 : 0.6,
          }}
        />
      </svg>

      {/* Center status dot */}
      <div
        className={cn(
          // Base styles - 8px dot centered
          "relative h-2 w-2 rounded-full transition-all duration-300 overflow-visible",
          // Color
          colors[status.state],
          // Glow effect for healthy/problematic states
          (isHealthy || isProblematic) && glowColors[status.state],
          // Pulse animation for problematic states
          isProblematic && "animate-pulse",
        )}
      >
        {/* Ripple effect for problematic states */}
        {isProblematic && (
          <span
            className={cn(
              "absolute inset-0 block h-full w-full rounded-full bg-inherit",
              "animate-ping opacity-60",
            )}
          />
        )}

        {/* Subtle inner highlight */}
        <span
          className={cn(
            "absolute inset-0.5 block rounded-full bg-white/30",
            "transition-opacity duration-300",
          )}
        />
      </div>
    </div>
  );

  // Delegate to client component when tooltip is needed (uses HoverCard)
  if (reason) {
    return <StatusDotClient dot={dot} reason={reason} />;
  }

  return dot;
}
