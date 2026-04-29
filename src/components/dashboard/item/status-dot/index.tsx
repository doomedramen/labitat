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
  progress?: number;
  tooltip?: React.ReactNode;
}

/**
 * StatusDot - shared status indicator that wraps with HoverCard when tooltip is needed.
 * Renders just the dot for simple statuses, wraps with HoverCard for error/degraded/slow states.
 * Includes a circular progress ring showing time until next sync.
 */
export function StatusDot({
  itemId,
  status,
  cached = false,
  pollingMs,
  progress,
  tooltip,
}: StatusDotProps) {
  const liveProgress = useSyncProgress(itemId, pollingMs);
  const syncProgress = Math.max(0, Math.min(100, progress ?? liveProgress));
  const visualState = cached ? "unknown" : status.state;
  const dotColorClass = cached ? "bg-secondary" : undefined;
  const ringColorClass = cached ? "text-secondary-foreground/45" : undefined;
  const bgColors = {
    unknown: "bg-muted-foreground/30",
    healthy: "bg-success",
    degraded: "bg-warning",
    reachable: "bg-success",
    unreachable: "bg-error",
    slow: "bg-warning",
    error: "bg-error",
  };

  // Text colors for SVG stroke (currentColor)
  const textColors = {
    unknown: "text-muted-foreground/30",
    healthy: "text-success",
    degraded: "text-warning",
    reachable: "text-success",
    unreachable: "text-error",
    slow: "text-warning",
    error: "text-error",
  };

  const glowColors = {
    unknown: "",
    healthy: "shadow-[0_0_8px_-2px_color-mix(in_srgb,var(--success)_60%,transparent)]",
    degraded: "shadow-[0_0_8px_-2px_color-mix(in_srgb,var(--warning)_60%,transparent)]",
    reachable: "shadow-[0_0_8px_-2px_color-mix(in_srgb,var(--success)_60%,transparent)]",
    unreachable: "shadow-[0_0_10px_-2px_color-mix(in_srgb,var(--destructive)_70%,transparent)]",
    slow: "shadow-[0_0_8px_-2px_color-mix(in_srgb,var(--warning)_60%,transparent)]",
    error: "shadow-[0_0_10px_-2px_color-mix(in_srgb,var(--destructive)_70%,transparent)]",
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
    visualState === "unreachable" ||
    visualState === "error" ||
    visualState === "degraded" ||
    visualState === "slow";

  const isHealthy = visualState === "healthy" || visualState === "reachable";

  const ariaLabel = `${labels[status.state]}${reason ? `: ${reason}` : ""}${cached ? " (cached)" : ""}`;

  // Calculate SVG ring properties
  // ViewBox is 16x16, center at 8,8
  // Center dot: 10px diameter (5px radius), extends from 3px to 13px
  // Gap: 1px (from dot edge at 5px to ring inner edge at 6px)
  // Ring: 2px stroke centered at radius 7, spans 6px to 8px from center
  // Total fits perfectly in 16px container (8px radius to edge)
  const radius = 7;
  const strokeWidth = 2;
  const dotSize = 10; // px
  const circumference = 2 * Math.PI * radius;
  // Progress depletes as we approach next sync (100% = just synced, 0% = about to sync)
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
      {/* Progress ring - always shown */}
      <svg viewBox="0 0 16 16" className="absolute inset-0 size-full -rotate-90" aria-hidden>
        {/* Background track */}
        <circle
          cx="8"
          cy="8"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          className={cn(ringColorClass ?? textColors[visualState])}
          style={{
            strokeDasharray: `${circumference} ${circumference}`,
            strokeDashoffset: 0,
            opacity: 0.2,
          }}
        />
        {/* Progress indicator - depletes as sync approaches */}
        <circle
          cx="8"
          cy="8"
          r={radius}
          fill="none"
          stroke="currentColor"
          strokeWidth={strokeWidth}
          strokeLinecap="round"
          className={cn(ringColorClass ?? textColors[visualState])}
          style={{
            strokeDasharray: `${circumference} ${circumference}`,
            strokeDashoffset: strokeDashoffset,
            opacity: 0.7,
          }}
        />
      </svg>

      {/* Center status dot - 10px diameter */}
      <div
        style={{ width: `${dotSize}px`, height: `${dotSize}px` }}
        className={cn(
          // Base styles - 10px dot centered
          "relative rounded-full transition-all duration-300 overflow-visible",
          // Color
          dotColorClass ?? bgColors[visualState],
          // Glow effect for healthy/problematic states
          (isHealthy || isProblematic) && glowColors[visualState],
        )}
      ></div>
    </div>
  );

  const tooltipContent =
    tooltip ??
    (reason ? <div className="px-3 py-2 text-sm font-medium text-foreground">{reason}</div> : null);

  if (tooltipContent) {
    return (
      <StatusDotClient
        dot={
          <div
            className="inline-flex cursor-default"
            onClick={(event) => {
              event.preventDefault();
              event.stopPropagation();
            }}
          >
            {dot}
          </div>
        }
        content={tooltipContent}
      />
    );
  }

  return dot;
}
