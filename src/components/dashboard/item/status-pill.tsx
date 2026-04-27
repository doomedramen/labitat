"use client";

import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function getStatusColor(state: string): string {
  switch (state) {
    case "error":
    case "unreachable":
      return "hsl(var(--error))";
    case "degraded":
    case "slow":
    case "warn":
      return "hsl(var(--warning))";
    case "healthy":
    case "reachable":
    case "ok":
      return "hsl(var(--success))";
    default:
      return "hsl(var(--muted-foreground))";
  }
}

function ProgressPill({ progress = 0, statusState }: { progress?: number; statusState: string }) {
  const color = getStatusColor(statusState);

  return (
    <div
      role="status"
      aria-label="Status"
      className="relative inline-flex items-center justify-center"
    >
      <div className="absolute -inset-[2px] rounded-full overflow-hidden">
        <div className="absolute inset-0 bg-border" />
        <div
          className="absolute inset-0"
          style={{
            background: `conic-gradient(${color} 0%, ${color} ${progress}%, transparent ${progress}%)`,
          }}
        />
      </div>
      <div className="relative rounded-full size-2 bg-current" />
    </div>
  );
}

interface StatusPillProps {
  progress: number;
  statusState: string;
  tooltip?: React.ReactNode;
}

export function StatusPill({ progress, statusState, tooltip }: StatusPillProps) {
  const pill = <ProgressPill progress={progress} statusState={statusState} />;

  if (!tooltip) return pill;

  return (
    <TooltipProvider delayDuration={200}>
      <Tooltip>
        <TooltipTrigger asChild>
          <div className="inline-flex cursor-default" onClick={(e) => e.stopPropagation()}>
            {pill}
          </div>
        </TooltipTrigger>
        <TooltipContent
          side="top"
          sideOffset={4}
          className="p-0 shadow-lg border border-border/50 bg-popover/95 backdrop-blur-sm rounded-xl max-w-xs overflow-hidden"
        >
          {tooltip}
        </TooltipContent>
      </Tooltip>
    </TooltipProvider>
  );
}
