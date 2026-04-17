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
    healthy: "bg-green-500",
    degraded: "bg-amber-500",
    reachable: "bg-green-500",
    unreachable: "bg-red-500",
    slow: "bg-amber-500",
    error: "bg-red-500",
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
        : undefined;

  const shouldPulse =
    status.state === "unreachable" ||
    status.state === "error" ||
    status.state === "degraded" ||
    status.state === "slow";

  const dot = (
    <div
      role="status"
      aria-label={reason ? `${labels[status.state]}: ${reason}` : labels[status.state]}
      className={cn(
        "relative h-2.5 w-2.5 rounded-full transition-all duration-300 overflow-visible",
        colors[status.state],
        shouldPulse &&
          "before:absolute before:inset-0 before:rounded-full before:bg-inherit before:content-[''] before:animate-pulse",
      )}
    >
      {cached ? (
        <svg
          aria-hidden
          data-testid="status-dot-cached-spinner"
          viewBox="0 0 10 10"
          className="pointer-events-none absolute inset-0 size-full animate-spin text-white/80 [filter:drop-shadow(0_0_1px_rgba(0,0,0,0.35))]"
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
