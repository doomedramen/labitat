import { cn } from "@/lib/utils"
import type { ServiceDefinition } from "./types"

type GlancesPerCpuData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  cores: number
  maxCore: number
  avgCpu: number
  coreUsages: number[]
}

function CoreBar({ pct }: { pct: number }) {
  const barColor =
    pct >= 90 ? "bg-destructive" : pct >= 70 ? "bg-amber-500" : "bg-primary"
  const textColor =
    pct >= 90
      ? "text-destructive"
      : pct >= 70
        ? "text-amber-500"
        : "text-secondary-foreground/60"

  return (
    <div className="flex items-center gap-1.5">
      <div className="h-1.5 min-w-0 flex-1 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            barColor
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      <span className={cn("w-7 shrink-0 text-right tabular-nums", textColor)}>
        {pct}%
      </span>
    </div>
  )
}

function GlancesPerCpuWidget({ coreUsages }: GlancesPerCpuData) {
  const usages = coreUsages ?? []

  if (usages.length === 0) {
    return (
      <div className="text-xs text-secondary-foreground/50">No core data</div>
    )
  }

  return (
    <div className="flex flex-col gap-1 text-xs">
      {usages.map((pct, i) => (
        <CoreBar key={i} pct={pct} />
      ))}
    </div>
  )
}

export const glancesPerCpuDefinition: ServiceDefinition<GlancesPerCpuData> = {
  id: "glances-percpu",
  name: "Glances Per-CPU",
  icon: "glances",
  category: "monitoring",
  defaultPollingMs: 10_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://glances.example.org",
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: false,
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: false,
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers: Record<string, string> = {}

    if (config.username && config.password) {
      headers["Authorization"] =
        `Basic ${btoa(`${config.username}:${config.password}`)}`
    }

    const res = await fetch(`${baseUrl}/api/4/percpu`, { headers })
    if (!res.ok) throw new Error(`Glances error: ${res.status}`)

    const percpu = await res.json()
    const coreList = Array.isArray(percpu) ? percpu : []

    const cpuValues = coreList.map((c: { total?: number }) =>
      Math.round(c.total ?? 0)
    )
    const maxCore = Math.max(...cpuValues, 0)
    const avgCpu =
      cpuValues.length > 0
        ? Math.round(
            cpuValues.reduce((a: number, b: number) => a + b, 0) /
              cpuValues.length
          )
        : 0

    return {
      _status: "ok",
      cores: coreList.length,
      maxCore,
      avgCpu,
      coreUsages: cpuValues,
    }
  },
  renderWidget: GlancesPerCpuWidget,
}
