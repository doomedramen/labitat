import type { ServiceDefinition } from "./types"
import { MiniBar } from "./viz"
import { GLANCES_BASE_FIELDS, makeGlancesGet } from "./glances-common"

// ── Data shape ────────────────────────────────────────────────────────────────

type CoreReading = { label: string; value: number }

type GlancesPerCpuData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  cores: CoreReading[]
}

// ── Widget ────────────────────────────────────────────────────────────────────

function coreBarColor(value: number) {
  if (value < 70) return "bg-primary"
  if (value < 90) return "bg-amber-400"
  return "bg-red-500"
}

function GlancesPerCpuWidget({ cores }: GlancesPerCpuData) {
  if (!cores?.length) return null

  return (
    <div className="space-y-1">
      {cores.map((core) => (
        <MiniBar
          key={core.label}
          label={core.label}
          value={core.value}
          max={100}
          valueLabel={`${core.value.toFixed(0)}%`}
          colorClass={coreBarColor(core.value)}
        />
      ))}
    </div>
  )
}

// ── Adapter definition ────────────────────────────────────────────────────────

export const glancesPerCpuDefinition: ServiceDefinition<GlancesPerCpuData> = {
  id: "glances-percpu",
  name: "Glances Per-Core CPU",
  icon: "glances",
  category: "monitoring",
  defaultPollingMs: 5_000,

  configFields: GLANCES_BASE_FIELDS,

  async fetchData(config) {
    const get = makeGlancesGet(config)
    const data: { total?: number; user?: number; system?: number }[] =
      await get("percpu")

    const cores: CoreReading[] = (Array.isArray(data) ? data : []).map(
      (c, i) => ({
        label: `C${i}`,
        value: c.total ?? c.user ?? 0,
      })
    )

    return {
      _status: "ok" as const,
      cores,
    }
  },

  Widget: GlancesPerCpuWidget,
}
