"use client"

import { useState, useEffect } from "react"
import { useSyncExternalStore } from "react"
import type { ServiceDefinition } from "./types"
import { TimeSeriesChart, formatBytes } from "./viz"
import { GLANCES_BASE_FIELDS, makeGlancesGet } from "./glances-common"

// ── Data shape ────────────────────────────────────────────────────────────────

type GlancesTSData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  metric: "cpu" | "memory" | "network" | "diskio"
  value1: number
  value2?: number
}

// ── Time series history store (external state management) ─────────────────────

const MAX_POINTS = 60

type HistoryStore = {
  update: (v1: number, v2?: number) => void
  subscribe: (callback: () => void) => () => void
  getSnapshot: () => { hist1: number[]; hist2: number[] }
}

function createHistoryStore(
  initialV1: number,
  initialV2?: number
): HistoryStore {
  const hist1 = [initialV1]
  const hist2 = initialV2 !== undefined ? [initialV2] : []
  const listeners = new Set<() => void>()
  // Cached snapshot — same reference until update() is called, which is required
  // by useSyncExternalStore to avoid triggering an infinite render loop.
  let snapshot = { hist1, hist2 }

  return {
    update(v1: number, v2?: number) {
      const newHist1 = [...snapshot.hist1.slice(-(MAX_POINTS - 1)), v1]
      const newHist2 =
        v2 !== undefined
          ? [...snapshot.hist2.slice(-(MAX_POINTS - 1)), v2]
          : snapshot.hist2
      snapshot = { hist1: newHist1, hist2: newHist2 }
      for (const listener of listeners) {
        listener()
      }
    },
    subscribe(callback: () => void) {
      listeners.add(callback)
      return () => {
        listeners.delete(callback)
      }
    },
    getSnapshot() {
      return snapshot
    },
  }
}

// ── Widget ────────────────────────────────────────────────────────────────────

function GlancesTSWidget({ metric, value1, value2 }: GlancesTSData) {
  // useState lazy init: factory runs once with the initial prop values
  const [store] = useState<HistoryStore>(() =>
    createHistoryStore(value1 ?? 0, value2)
  )

  // Synchronize store with prop changes - effect is correct for syncing
  // React state with external systems
  useEffect(() => {
    store.update(value1 ?? 0, value2)
  }, [store, value1, value2])

  // Subscribe to store updates
  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  )

  const { hist1, hist2 } = snapshot

  if (metric === "cpu") {
    return (
      <TimeSeriesChart
        history={hist1}
        max={100}
        colorClass="text-primary"
        label="CPU"
        valueLabel={`${(value1 ?? 0).toFixed(1)}%`}
      />
    )
  }

  if (metric === "memory") {
    return (
      <TimeSeriesChart
        history={hist1}
        max={100}
        colorClass="text-blue-500"
        label="RAM"
        valueLabel={`${(value1 ?? 0).toFixed(1)}%`}
      />
    )
  }

  // Network and diskio: dual charts with dynamic max
  const dualMax = Math.max(...hist1, ...hist2, 1) * 1.15

  if (metric === "network") {
    return (
      <div className="space-y-2">
        <TimeSeriesChart
          history={hist1}
          max={dualMax}
          colorClass="text-emerald-500"
          label="↓ Rx"
          valueLabel={formatBytes(value1 ?? 0) + "/s"}
        />
        <TimeSeriesChart
          history={hist2}
          max={dualMax}
          colorClass="text-orange-400"
          label="↑ Tx"
          valueLabel={formatBytes(value2 ?? 0) + "/s"}
        />
      </div>
    )
  }

  // diskio
  return (
    <div className="space-y-2">
      <TimeSeriesChart
        history={hist1}
        max={dualMax}
        colorClass="text-sky-400"
        label="Read"
        valueLabel={formatBytes(value1 ?? 0) + "/s"}
      />
      <TimeSeriesChart
        history={hist2}
        max={dualMax}
        colorClass="text-violet-400"
        label="Write"
        valueLabel={formatBytes(value2 ?? 0) + "/s"}
      />
    </div>
  )
}

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
