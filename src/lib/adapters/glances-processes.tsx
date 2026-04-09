import type { ServiceDefinition } from "./types"

export type { GlancesProcessesData }

type ProcessInfo = {
  name: string
  cpu: number
  memory: number
  pid: number
}

type GlancesProcessesData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  processes: ProcessInfo[]
  sortBy: "cpu" | "memory" | "both"
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
      {
        key: "topCount",
        label: "Top processes count",
        type: "number",
        required: false,
        placeholder: "10",
        helperText: "Number of top processes to show",
      },
      {
        key: "sortBy",
        label: "Sort by",
        type: "select",
        required: false,
        options: [
          { label: "CPU usage", value: "cpu" },
          { label: "Memory usage", value: "memory" },
          { label: "Highest of either", value: "both" },
        ],
      },
    ],
    async fetchData(config) {
      const baseUrl = config.url.replace(/\/$/, "")
      const headers: Record<string, string> = {}

      if (config.username && config.password) {
        headers["Authorization"] =
          `Basic ${btoa(`${config.username}:${config.password}`)}`
      }

      const topCount = parseInt(config.topCount ?? "10", 10) || 10
      const sortBy = config.sortBy ?? "cpu"

      // Fetch process list from Glances
      const res = await fetch(`${baseUrl}/api/4/processlist`, { headers })
      if (!res.ok) throw new Error(`Glances error: ${res.status}`)

      const procList = await res.json()

      // Response is an array of process objects
      if (!Array.isArray(procList)) {
        throw new Error("Unexpected processlist response format")
      }

      // Sort processes by CPU, memory, or the highest of either
      const score = (p: { cpu_percent?: number; memory_percent?: number }) => {
        if (sortBy === "memory") return p.memory_percent ?? 0
        if (sortBy === "both")
          return Math.max(p.cpu_percent ?? 0, p.memory_percent ?? 0)
        return p.cpu_percent ?? 0
      }
      const sorted = [...procList].sort((a, b) => score(b) - score(a))

      // Take top N processes
      const topProcesses = sorted.slice(0, topCount).map((p) => ({
        name: p.name ?? "unknown",
        cpu: p.cpu_percent ?? 0,
        memory: p.memory_percent ?? 0,
        pid: p.pid ?? 0,
      }))

      return {
        _status: "ok",
        processes: topProcesses,
        sortBy: sortBy as "cpu" | "memory" | "both",
      }
    },
    renderWidget: () => null, // Placeholder - real widget is client-side
  }
