import type { ServiceDefinition } from "./types"
import { GLANCES_BASE_FIELDS, makeGlancesGet } from "./glances-common"
import { GlancesTSWidget } from "./glances-timeseries-widget"
import type { GlancesTSData } from "./glances-timeseries-widget"

export type { GlancesTSData } from "./glances-timeseries-widget"

// ── Adapter definition ────────────────────────────────────────────────────────

export const glancesTimeseriesDefinition: ServiceDefinition<GlancesTSData> = {
  id: "glances-timeseries",
  name: "Glances Time Series",
  icon: "glances",
  category: "monitoring",
  defaultPollingMs: 5_000,

  configFields: [
    ...GLANCES_BASE_FIELDS,
    {
      key: "metric",
      label: "Metric",
      type: "select",
      required: true,
      options: [
        { label: "CPU Usage", value: "cpu" },
        { label: "Memory Usage", value: "memory" },
        { label: "Network I/O (Rx & Tx)", value: "network" },
        { label: "Disk I/O (Read & Write)", value: "diskio" },
      ],
    },
  ],

  async fetchData(config) {
    const metric = (config.metric ?? "cpu") as GlancesTSData["metric"]
    const get = makeGlancesGet(config)

    if (metric === "cpu") {
      const data = await get("cpu")
      return {
        _status: "ok" as const,
        metric,
        value1: data.total ?? 0,
      }
    }

    if (metric === "memory") {
      const data = await get("mem")
      return {
        _status: "ok" as const,
        metric,
        value1: data.percent ?? 0,
      }
    }

    if (metric === "network") {
      const data: { rx: number; tx: number; interface_name?: string }[] =
        await get("network")
      const ifaces = Array.isArray(data)
        ? data.filter((n) => n.interface_name !== "lo")
        : []
      return {
        _status: "ok" as const,
        metric,
        value1: ifaces.reduce((s, n) => s + (n.rx ?? 0), 0),
        value2: ifaces.reduce((s, n) => s + (n.tx ?? 0), 0),
      }
    }

    // diskio
    const data: {
      disk_name: string
      read_bytes: number
      write_bytes: number
      time_since_update: number
    }[] = await get("diskio")
    const disks = Array.isArray(data)
      ? data.filter((d) => !d.disk_name.startsWith("loop"))
      : []
    const tsu = disks[0]?.time_since_update || 1
    return {
      _status: "ok" as const,
      metric,
      value1: disks.reduce((s, d) => s + (d.read_bytes ?? 0), 0) / tsu,
      value2: disks.reduce((s, d) => s + (d.write_bytes ?? 0), 0) / tsu,
    }
  },

  Widget: GlancesTSWidget,
}
