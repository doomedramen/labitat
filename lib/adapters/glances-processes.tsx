import type { ServiceDefinition } from "./types"
import { GLANCES_BASE_FIELDS, makeGlancesGet } from "./glances-common"
import { cn } from "@/lib/utils"

// ── Data shape ────────────────────────────────────────────────────────────────

type ProcessRow = {
  name: string
  cpu: number
  mem: number
  pid: number
}

type GlancesProcessesData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  processes: ProcessRow[]
  sortBy: "cpu" | "memory"
}

// ── Widget ────────────────────────────────────────────────────────────────────

function cpuColor(v: number) {
  if (v < 30) return "bg-primary"
  if (v < 70) return "bg-amber-400"
  return "bg-red-500"
}

function GlancesProcessesWidget({ processes, sortBy }: GlancesProcessesData) {
  if (!processes?.length)
    return <p className="text-xs text-muted-foreground">No processes</p>

  const primaryKey = sortBy === "memory" ? "mem" : "cpu"

  return (
    <div className="space-y-1">
      {processes.map((proc) => {
        const barPct = Math.min(100, proc[primaryKey])
        return (
          <div key={proc.pid} className="flex items-center gap-2 text-xs">
            {/* Name */}
            <span
              className="min-w-0 flex-1 truncate font-medium text-foreground"
              title={proc.name}
            >
              {proc.name}
            </span>
            {/* Bar */}
            <div className="relative h-1.5 w-12 shrink-0 overflow-hidden rounded-full bg-secondary">
              <div
                className={cn(
                  "h-full rounded-full transition-all duration-500",
                  cpuColor(proc[primaryKey])
                )}
                style={{ width: `${barPct}%` }}
              />
            </div>
            {/* CPU */}
            <span className="w-9 shrink-0 text-right text-muted-foreground tabular-nums">
              {proc.cpu.toFixed(1)}%
            </span>
            {/* RAM */}
            <span className="w-9 shrink-0 text-right text-muted-foreground tabular-nums">
              {proc.mem.toFixed(1)}%
            </span>
          </div>
        )
      })}
      {/* Column headers */}
      <div className="flex items-center gap-2 text-[10px] text-muted-foreground/60">
        <span className="flex-1" />
        <span className="w-12 shrink-0" />
        <span className="w-9 shrink-0 text-right">cpu</span>
        <span className="w-9 shrink-0 text-right">mem</span>
      </div>
    </div>
  )
}

// ── Adapter definition ────────────────────────────────────────────────────────

export const glancesProcessesDefinition: ServiceDefinition<GlancesProcessesData> =
  {
    id: "glances-processes",
    name: "Glances Processes",
    icon: "glances",
    category: "monitoring",
    defaultPollingMs: 10_000,

    configFields: [
      ...GLANCES_BASE_FIELDS,
      {
        key: "count",
        label: "Process count",
        type: "select",
        required: false,
        options: [
          { label: "5 processes", value: "5" },
          { label: "8 processes", value: "8" },
          { label: "10 processes", value: "10" },
        ],
      },
      {
        key: "sortBy",
        label: "Sort by",
        type: "select",
        required: false,
        options: [
          { label: "CPU usage", value: "cpu" },
          { label: "Memory usage", value: "memory" },
        ],
      },
    ],

    async fetchData(config) {
      const get = makeGlancesGet(config)
      const count = parseInt(config.count ?? "5", 10)
      const sortBy = (config.sortBy ?? "cpu") as "cpu" | "memory"

      type GlancesProcess = {
        name: string
        cpu_percent: number
        memory_percent: number
        pid: number
      }

      const data: GlancesProcess[] = await get("processlist")
      const list = Array.isArray(data) ? data : []

      const sorted = [...list]
        .sort((a, b) =>
          sortBy === "memory"
            ? (b.memory_percent ?? 0) - (a.memory_percent ?? 0)
            : (b.cpu_percent ?? 0) - (a.cpu_percent ?? 0)
        )
        .slice(0, count)
        .map((p) => ({
          name: p.name,
          cpu: p.cpu_percent ?? 0,
          mem: p.memory_percent ?? 0,
          pid: p.pid,
        }))

      return {
        _status: "ok" as const,
        processes: sorted,
        sortBy,
      }
    },

    Widget: GlancesProcessesWidget,
  }
