"use client"

import type { ServiceDefinition } from "./types"
import { DiskDonut } from "./viz"
import { GLANCES_BASE_FIELDS, makeGlancesGet } from "./glances-common"

// ── Data shape ────────────────────────────────────────────────────────────────

type DiskEntry = {
  label: string
  name: string
  percent: number
  used: number
  total: number
}

type GlancesDiskUsageData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  disks: DiskEntry[]
}

// ── Widget ────────────────────────────────────────────────────────────────────

function GlancesDiskUsageWidget({ disks }: GlancesDiskUsageData) {
  if (!disks?.length)
    return <p className="text-xs text-muted-foreground">No disks</p>

  return (
    <div className="flex flex-wrap gap-4">
      {disks.map((d) => (
        <DiskDonut
          key={d.label}
          label={d.label}
          name={d.name}
          percent={d.percent}
          used={d.used}
          total={d.total}
        />
      ))}
    </div>
  )
}

// ── Adapter definition ────────────────────────────────────────────────────────

export const glancesDiskUsageDefinition: ServiceDefinition<GlancesDiskUsageData> =
  {
    id: "glances-diskusage",
    name: "Glances Disk Usage",
    icon: "glances",
    category: "monitoring",
    defaultPollingMs: 30_000,

    configFields: [
      ...GLANCES_BASE_FIELDS,
      {
        key: "mounts",
        label: "Mount points (optional)",
        type: "text",
        required: false,
        placeholder: "/, /data",
        helperText:
          "Comma-separated list of mount points to show. Leave blank to show all.",
      },
    ],

    async fetchData(config) {
      const get = makeGlancesGet(config)

      type FsEntry = {
        mnt_point: string
        device_name: string
        percent: number
        used: number
        size: number
      }

      const data: FsEntry[] = await get("fs")
      const list = Array.isArray(data) ? data : []

      const mounts = config.mounts
        ? config.mounts
            .split(",")
            .map((m) => m.trim())
            .filter(Boolean)
        : null

      const disks: DiskEntry[] = list
        .filter((d) => !mounts || mounts.includes(d.mnt_point))
        .map((d) => ({
          label: d.mnt_point,
          // Use device name shortened (e.g. "sda1" from "/dev/sda1")
          name: d.device_name?.split("/").at(-1) ?? d.mnt_point,
          percent: d.percent ?? 0,
          used: d.used ?? 0,
          total: d.size ?? 0,
        }))

      return {
        _status: "ok" as const,
        disks,
      }
    },

    Widget: GlancesDiskUsageWidget,
  }
