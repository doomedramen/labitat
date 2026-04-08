import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

type GlancesProcessesData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  total: number
  running: number
  sleeping: number
  topCpu: string
  topMem: string
}

function GlancesProcessesWidget({
  total,
  running,
  sleeping,
  topCpu,
  topMem,
}: GlancesProcessesData) {
  return (
    <StatGrid
      items={[
        { value: total, label: "Total" },
        { value: running, label: "Running" },
        { value: sleeping, label: "Sleeping" },
        { value: topCpu, label: "Top CPU" },
        { value: topMem, label: "Top Mem" },
      ]}
    />
  )
}

export const glancesProcessesDefinition: ServiceDefinition<GlancesProcessesData> =
  {
    id: "glances-processes",
    name: "Glances Processes",
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

      const res = await fetch(`${baseUrl}/api/4/processlist`, { headers })
      if (!res.ok) throw new Error(`Glances error: ${res.status}`)

      const processes = await res.json()
      const procList = Array.isArray(processes)
        ? processes
        : (processes.processes ?? [])

      const total = procList.length
      const running = procList.filter(
        (p: { status: string }) => p.status === "running"
      ).length
      const sleeping = procList.filter(
        (p: { status: string }) => p.status === "sleeping"
      ).length

      // Top processes by CPU and memory
      const sortedByCpu = [...procList].sort(
        (a: { cpu_percent: number }, b: { cpu_percent: number }) =>
          b.cpu_percent - a.cpu_percent
      )
      const sortedByMem = [...procList].sort(
        (a: { memory_percent: number }, b: { memory_percent: number }) =>
          b.memory_percent - a.memory_percent
      )

      const topCpuProc = sortedByCpu[0]
      const topMemProc = sortedByMem[0]

      return {
        _status: "ok",
        total,
        running,
        sleeping,
        topCpu: topCpuProc
          ? `${topCpuProc.name?.slice(0, 10) ?? "?"} ${topCpuProc.cpu_percent?.toFixed(0) ?? 0}%`
          : "—",
        topMem: topMemProc
          ? `${topMemProc.name?.slice(0, 10) ?? "?"} ${topMemProc.memory_percent?.toFixed(0) ?? 0}%`
          : "—",
      }
    },
    Widget: GlancesProcessesWidget,
  }
