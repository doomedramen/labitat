import type { GlancesProcessesData } from "@/lib/adapters/glances-processes";
import { cn } from "@/lib/utils";
import { Circle, AlertTriangle, Pause, StopCircle } from "lucide-react";

function valueColor(value: number, warnAt: number, critAt: number): string {
  if (value >= critAt) return "text-destructive";
  if (value >= warnAt) return "text-danger";
  return "text-secondary-foreground";
}

/**
 * Process status icon mapping (like Homepage's Glances processes widget)
 * R - Running (green circle)
 * S - Sleeping (blue outline circle)
 * D - Disk sleep (blue double circle)
 * Z - Zombie (red alert triangle)
 * T - Traced (purple hexagon)
 * X - Dead (gray diamond)
 */
function StatusIcon({ status }: { status: string }) {
  switch (status) {
    case "R": // Running
      return <Circle className="h-3 w-3 fill-success text-success" />;
    case "S": // Sleeping
      return <Circle className="h-3 w-3 text-blue-500" />;
    case "D": // Disk sleep
      return <Pause className="h-3 w-3 text-blue-500" />;
    case "Z": // Zombie
      return <AlertTriangle className="h-3 w-3 text-destructive" />;
    case "T": // Traced
    case "t":
      return <StopCircle className="h-3 w-3 text-purple-500" />;
    case "X": // Dead
      return <Circle className="h-3 w-3 text-muted-foreground/50" />;
    default:
      return <Circle className="h-3 w-3 text-muted-foreground/50" />;
  }
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
    );
  }

  if (!processes || processes.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        No processes available
      </div>
    );
  }

  const score = (p: { cpu: number; memory: number }) =>
    sortBy === "memory" ? p.memory : sortBy === "both" ? Math.max(p.cpu, p.memory) : p.cpu;
  const sorted = [...processes].sort((a, b) => score(b) - score(a));

  return (
    <div className="flex flex-col gap-0.5 text-xs">
      {/* Header */}
      <div className="grid grid-cols-12 gap-2 px-2 py-0.5 text-secondary-foreground/50">
        <div className="col-span-7">Process</div>
        <div
          className={cn(
            "col-span-2 text-right",
            (sortBy === "cpu" || sortBy === "both") && "font-medium text-secondary-foreground/80",
          )}
        >
          CPU
        </div>
        <div
          className={cn(
            "col-span-3 text-right",
            (sortBy === "memory" || sortBy === "both") &&
              "font-medium text-secondary-foreground/80",
          )}
        >
          MEM
        </div>
      </div>

      {/* Process rows */}
      {sorted.map((proc, idx) => (
        <div
          key={proc.pid ?? idx}
          className="grid grid-cols-12 gap-2 rounded-md px-2 py-1 hover:bg-secondary/50"
        >
          <div className="col-span-7 flex items-center gap-1.5">
            {proc.status && (
              <span className="shrink-0 opacity-50">
                <StatusIcon status={proc.status} />
              </span>
            )}
            <div className="truncate text-secondary-foreground" title={proc.name}>
              {proc.name}
            </div>
          </div>
          <div className={cn("col-span-2 text-right tabular-nums", valueColor(proc.cpu, 30, 70))}>
            {proc.cpu.toFixed(1)}%
          </div>
          <div className={cn("col-span-3 text-right tabular-nums", valueColor(proc.memory, 5, 20))}>
            {proc.memory.toFixed(1)}%
          </div>
        </div>
      ))}
    </div>
  );
}
