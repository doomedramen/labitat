"use client";

import React from "react";
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from "@/components/ui/tooltip";

interface ProgressPillProps {
  label: string;
  progress?: number;
  color?: string;
  dotClassName?: string;
  className?: string;
}

function ProgressPill({
  label,
  progress = 0,
  color = "#7F77DD",
  dotClassName = "bg-error",
  className = "",
}: ProgressPillProps) {
  return (
    <div className="relative inline-flex">
      {/* Border container - behind the pill */}
      <div className="absolute -inset-[2px] rounded-full overflow-hidden">
        {/* Track */}
        <div className="absolute inset-0 bg-border" />
        {/* Progress */}
        <div
          className="absolute inset-0"
          style={{
            background: `conic-gradient(${color} 0%, ${color} ${progress}%, transparent ${progress}%)`,
          }}
        />
      </div>

      {/* Pill content */}
      <div
        className={`relative inline-flex items-center gap-1.5 px-2 py-0 rounded-full text-sm font-medium ${className}`}
      >
        <div className={`size-2 rounded-full flex-shrink-0 ${dotClassName}`} />
        {label}
      </div>
    </div>
  );
}

interface StatusPillProps {
  label: string;
  progress: number;
  color: string;
  dotClassName: string;
  tooltip?: React.ReactNode;
}

export function StatusPill({ label, progress, color, dotClassName, tooltip }: StatusPillProps) {
  const pill = (
    <ProgressPill
      label={label}
      progress={progress}
      color={color}
      dotClassName={dotClassName}
      className="bg-secondary text-foreground cursor-default"
    />
  );

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
