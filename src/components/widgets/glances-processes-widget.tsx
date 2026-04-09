"use client"

import type { GlancesProcessesData } from "@/lib/adapters/glances-processes"
import { cn } from "@/lib/utils"

function valueColor(value: number, warnAt: number, critAt: number): string {
  if (value >= critAt) return "text-destructive"
  if (value >= warnAt) return "text-amber-500"
  return "text-secondary-foreground"
}

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

  const score = (p: { cpu: number; memory: number }) =>
    sortBy === "memory"
      ? p.memory
      : sortBy === "both"
        ? Math.max(p.cpu, p.memory)
        : p.cpu
  const sorted = [...processes].sort((a, b) => score(b) - score(a))

  return (
    <div className="flex flex-col gap-0.5 text-xs">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-2 py-0.5 text-secondary-foreground/50">
        <div className="col-span-6">Process</div>
        <div
          className={cn(
            "col-span-3 text-right",
            (sortBy === "cpu" || sortBy === "both") &&
              "font-medium text-secondary-foreground/80"
          )}
        >
          CPU
        </div>
        <div
          className={cn(
            "col-span-3 text-right",
            (sortBy === "memory" || sortBy === "both") &&
              "font-medium text-secondary-foreground/80"
          )}
        >
          MEM
        </div>
      </div>

      {/* Process rows */}
      {sorted.map((proc, idx) => (
        <div
          key={idx}
          className="grid grid-cols-12 gap-2 rounded-md px-2 py-1 hover:bg-secondary/50"
        >
          <div
            className="col-span-6 truncate text-secondary-foreground"
            title={proc.name}
          >
            {proc.name}
          </div>
          <div
            className={cn(
              "col-span-3 text-right tabular-nums",
              valueColor(proc.cpu, 30, 70)
            )}
          >
            {proc.cpu.toFixed(1)}%
          </div>
          <div
            className={cn(
              "col-span-3 text-right tabular-nums",
              valueColor(proc.memory, 5, 20)
            )}
          >
            {proc.memory.toFixed(1)}%
          </div>
        </div>
      ))}
    </div>
  )
}
