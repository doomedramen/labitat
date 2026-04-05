import type { ServiceDefinition } from "./types"
import { TempBar } from "./viz"
import { GLANCES_BASE_FIELDS, makeGlancesGet } from "./glances-common"

// ── Data shape ────────────────────────────────────────────────────────────────

type SensorReading = {
  label: string
  celsius: number
  max: number
}

type GlancesSensorsData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  sensors: SensorReading[]
}

// ── Widget ────────────────────────────────────────────────────────────────────

function GlancesSensorsWidget({ sensors }: GlancesSensorsData) {
  if (!sensors?.length)
    return <p className="text-xs text-muted-foreground">No sensors</p>

  return (
    <div className="flex flex-wrap gap-3">
      {sensors.map((s) => (
        <TempBar
          key={s.label}
          label={s.label}
          celsius={s.celsius}
          max={s.max}
        />
      ))}
    </div>
  )
}

// ── Adapter definition ────────────────────────────────────────────────────────

export const glancesSensorsDefinition: ServiceDefinition<GlancesSensorsData> = {
  id: "glances-sensors",
  name: "Glances Temperature Sensors",
  icon: "glances",
  category: "monitoring",
  defaultPollingMs: 15_000,

  configFields: [
    ...GLANCES_BASE_FIELDS,
    {
      key: "filter",
      label: "Label filter (optional)",
      type: "text",
      required: false,
      placeholder: "Core",
      helperText:
        "Only show sensors whose label starts with this string. Leave blank for all.",
    },
  ],

  async fetchData(config) {
    const get = makeGlancesGet(config)

    type GlancesSensor = {
      label: string
      value: number
      critical?: number
      warning?: number
      unit: string
      type: string
    }

    const data: GlancesSensor[] = await get("sensors")
    const list = Array.isArray(data) ? data : []

    const filter = config.filter?.trim()

    const sensors: SensorReading[] = list
      .filter(
        (s) =>
          s.unit === "°C" &&
          s.type === "temperature_core" &&
          typeof s.value === "number" &&
          (!filter || s.label?.startsWith(filter))
      )
      .map((s) => ({
        label: s.label,
        celsius: s.value,
        max: s.critical ?? s.warning ?? 100,
      }))

    return {
      _status: "ok" as const,
      sensors,
    }
  },

  Widget: GlancesSensorsWidget,
}
