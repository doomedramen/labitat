"use client"

import { cn } from "@/lib/utils"
import type { ServiceStatus } from "@/lib/adapters/types"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"

interface StatusDotProps {
  status: ServiceStatus
}

export function StatusDot({ status }: StatusDotProps) {
  const colors = {
    unknown: "bg-muted-foreground/30",
    healthy: "bg-green-500",
    reachable: "bg-green-500",
    unreachable: "bg-red-500",
    error: "bg-red-500",
  }

  const labels = {
    unknown: "Status unknown",
    healthy: "Healthy",
    reachable: "Reachable",
    unreachable: "Unreachable",
    error: "Error",
  }

  const reason =
    status.state === "unreachable" || status.state === "error"
      ? status.reason
      : undefined

  const dot = (
    <div
      role="status"
      aria-label={
        reason ? `${labels[status.state]}: ${reason}` : labels[status.state]
      }
      className={cn(
        "h-2.5 w-2.5 rounded-full transition-colors",
        colors[status.state]
      )}
    />
  )

  if (reason) {
    return (
      <Tooltip>
        <TooltipTrigger asChild>{dot}</TooltipTrigger>
        <TooltipContent side="top" className="max-w-xs text-xs">
          {reason}
        </TooltipContent>
      </Tooltip>
    )
  }

  return dot
}
