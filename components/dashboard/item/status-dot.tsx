"use client"

import { cn } from "@/lib/utils"
import {
  Tooltip,
  TooltipContent,
  TooltipTrigger,
} from "@/components/ui/tooltip"
import type { ServiceStatus } from "@/lib/adapters/types"

// ── Status configuration ──────────────────────────────────────────────────────

const statusColors: Record<ServiceStatus["state"], string> = {
  healthy: "bg-emerald-500",
  reachable: "bg-amber-400",
  unreachable: "bg-red-500",
  error: "bg-red-500",
  unknown: "bg-zinc-400",
}

const statusPulse: Record<ServiceStatus["state"], boolean> = {
  healthy: true,
  reachable: false,
  unreachable: true,
  error: true,
  unknown: false,
}

const statusLabels: Record<ServiceStatus["state"], string> = {
  healthy: "Healthy",
  reachable: "Reachable",
  unreachable: "Unreachable",
  error: "Error",
  unknown: "Unknown",
}

// ── StatusDot component ───────────────────────────────────────────────────────

interface StatusDotProps {
  status: ServiceStatus
}

export function StatusDot({ status }: StatusDotProps) {
  const color = statusColors[status.state]
  const label = statusLabels[status.state]
  const reason = "reason" in status ? status.reason : undefined

  const tooltipContent = reason ? `${label}: ${reason}` : label
  const pulse = statusPulse[status.state]

  return (
    <Tooltip>
      <TooltipTrigger
        render={
          <span className="relative flex size-2">
            {pulse && (
              <span
                className={cn(
                  "absolute inset-0 size-2 animate-ping rounded-full opacity-75",
                  color
                )}
              />
            )}
            <span
              className={cn(
                "relative block size-2 rounded-full ring-1 ring-card",
                color
              )}
            />
          </span>
        }
      />
      <TooltipContent side="top" className="text-xs">
        {tooltipContent}
      </TooltipContent>
    </Tooltip>
  )
}
