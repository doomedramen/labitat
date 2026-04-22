"use client";

import { cn } from "@/lib/utils";
import type { ServiceStatus } from "@/lib/adapters/types";
import { StatusDotClient } from "./status-dot-client";

interface StatusDotProps {
  status: ServiceStatus;
  cached?: boolean;
}

/**
 * StatusDot - shared status indicator that wraps with HoverCard when tooltip is needed.
 * Renders just the dot for simple statuses, wraps with HoverCard for error/degraded/slow states.
 */
export function StatusDot({ status, cached = false }: StatusDotProps) {
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

  const dot = (
    <div
      role="status"
      aria-label={ariaLabel}
      className={cn(
        // Base styles
        "relative h-2.5 w-2.5 rounded-full transition-all duration-300 overflow-visible",
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

      {/* Cached spinner */}
      {cached ? (
        <svg
          aria-hidden
          data-testid="status-dot-cached-spinner"
          viewBox="0 0 10 10"
          className={cn(
            "pointer-events-none absolute inset-0 size-full animate-spin",
            "[filter:drop-shadow(0_0_1px_rgba(0,0,0,0.35))]",
            status.state === "unknown" ? "text-white/40" : "text-white/80",
          )}
        >
          <circle
            cx="5"
            cy="5"
            r="4"
            fill="none"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeDasharray="10 20"
          />
        </svg>
      ) : null}
    </div>
  );

  // Delegate to client component when tooltip is needed (uses HoverCard)
  if (reason) {
    return <StatusDotClient dot={dot} reason={reason} />;
  }

  return dot;
}
