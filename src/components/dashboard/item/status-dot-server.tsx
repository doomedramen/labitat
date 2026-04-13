import { cn } from "@/lib/utils";
import type { ServiceStatus } from "@/lib/adapters/types";

interface StatusDotServerProps {
  status: ServiceStatus;
}

/**
 * Server-compatible StatusDot.
 * Renders just the dot without HoverCard interactivity.
 */
export function StatusDotServer({ status }: StatusDotServerProps) {
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

  return (
    <div
      role="status"
      aria-label={reason ? `${labels[status.state]}: ${reason}` : labels[status.state]}
      className={cn(
        "h-2.5 w-2.5 rounded-full transition-all duration-300",
        colors[status.state],
        (status.state === "unreachable" ||
          status.state === "error" ||
          status.state === "degraded" ||
          status.state === "slow") &&
          "animate-pulse",
      )}
    />
  );
}
