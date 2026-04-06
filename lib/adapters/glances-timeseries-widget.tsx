"use client"

import { useState, useEffect } from "react"
import { useSyncExternalStore } from "react"
import { TimeSeriesChart, formatBytes } from "./viz"

// ── Data shape ────────────────────────────────────────────────────────────────

export type GlancesTSData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  metric: "cpu" | "memory" | "network" | "diskio"
  value1: number
  value2?: number
}

// ── Time series history store (external state management) ─────────────────────

const MAX_POINTS = 20

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

export function GlancesTSWidget({ metric, value1, value2 }: GlancesTSData) {
  const [store] = useState<HistoryStore>(() =>
    createHistoryStore(value1 ?? 0, value2)
  )

  useEffect(() => {
    store.update(value1 ?? 0, value2)
  }, [store, value1, value2])

  const snapshot = useSyncExternalStore(
    store.subscribe,
    store.getSnapshot,
    store.getSnapshot
  )

  const { hist1, hist2 } = snapshot

  // Dynamic scaling: use the data range with padding, capped at 100 for
  // percentage metrics so the chart never exceeds the logical maximum.
  const histMax = Math.max(...hist1, 0.1)
  const scaledMax = Math.min(histMax * 1.15, 100)

  if (metric === "cpu") {
    return (
      <TimeSeriesChart
        history={hist1}
        max={scaledMax}
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
        max={scaledMax}
        colorClass="text-blue-500"
        label="RAM"
        valueLabel={`${(value1 ?? 0).toFixed(1)}%`}
      />
    )
  }

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
