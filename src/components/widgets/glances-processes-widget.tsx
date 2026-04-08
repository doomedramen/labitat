"use client"

import type { GlancesProcessesData } from "./glances-processes"
import { cn } from "@/lib/utils"

export function GlancesProcessesWidget({
  processes,
  sortBy,
  _status,
  _statusText,
}: GlancesProcessesData) {
  if (_status === "error") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        {_statusText ?? "Error fetching processes"}
      </div>
    )
  }

  if (!processes || processes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No processes available
      </div>
    )
  }

  const sorted = [...processes].sort((a, b) => {
    if (sortBy === "memory") {
      return b.memory - a.memory
    }
    return b.cpu - a.cpu
  })

  return (
    <div className="flex h-full flex-col gap-0.5 text-xs">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 rounded-md bg-secondary px-2 py-1 font-medium text-secondary-foreground/60">
        <div className="col-span-6">Process</div>
        <div className="col-span-3 text-right">CPU</div>
        <div className="col-span-3 text-right">MEM</div>
      </div>
      {/* Process list */}
      <div className="flex flex-col gap-0.5">
        {sorted.map((proc, idx) => (
          <div
            key={idx}
            className={cn(
              "grid grid-cols-12 gap-2 rounded-md px-2 py-1",
              "hover:bg-secondary/50"
            )}
          >
            <div className="col-span-6 truncate font-medium" title={proc.name}>
              {proc.name}
            </div>
            <div className="col-span-3 text-right tabular-nums">
              {proc.cpu.toFixed(1)}%
            </div>
            <div className="col-span-3 text-right tabular-nums">
              {proc.memory.toFixed(1)}%
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
