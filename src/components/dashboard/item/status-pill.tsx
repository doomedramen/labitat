"use client";

import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

function getStatusColors(state: string) {
  switch (state) {
    case "error":
    case "unreachable":
      return { colorVar: "hsl(var(--error))", bgClass: "bg-error" };
    case "degraded":
    case "slow":
    case "warn":
      return { colorVar: "hsl(var(--warning))", bgClass: "bg-warning" };
    case "healthy":
    case "reachable":
    case "ok":
      return { colorVar: "hsl(var(--success))", bgClass: "bg-success" };
    default:
      return { colorVar: "hsl(var(--muted-foreground))", bgClass: "bg-muted-foreground/50" };
  }
}

function ProgressPill({ progress = 0, statusState }: { progress?: number; statusState: string }) {
  const { colorVar, bgClass } = getStatusColors(statusState);

  // Progress ring: 24px diameter, 10px radius, 2px stroke
  const circumference = 2 * Math.PI * 10;
  const strokeDashoffset = (progress / 100) * circumference;

  return (
    <div role="status" aria-label="Status" className="relative inline-flex items-center">
      <svg viewBox="0 0 24 24" className="relative size-6 -rotate-90" aria-hidden>
        <circle cx="12" cy="12" r="10" fill="none" stroke="hsl(var(--border))" strokeWidth="2" />
        <circle
          cx="12"
          cy="12"
          r="10"
          fill="none"
          stroke={colorVar}
          strokeWidth="2"
          strokeLinecap="round"
          strokeDasharray={circumference}
          strokeDashoffset={strokeDashoffset}
          className="transition-all duration-1000 ease-linear"
        />
      </svg>
      <div
        className={`absolute rounded-full size-1.5 ${bgClass} ${
          statusState === "error" || statusState === "unreachable"
            ? "shadow-[0_0_4px_0px_hsl(var(--error)/0.6)]"
            : statusState === "healthy" || statusState === "reachable"
              ? "shadow-[0_0_4px_0px_hsl(var(--success)/0.5)]"
              : ""
        }`}
      />
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
