import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

type GlancesPerCpuData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  cores: number
  maxCore: number
  avgCpu: number
}

function GlancesPerCpuWidget({ cores, maxCore, avgCpu }: GlancesPerCpuData) {
  return (
    <StatGrid
      items={[
        { value: cores ?? 0, label: "Cores" },
        { value: `${maxCore ?? 0}%`, label: "Max Core" },
        { value: `${avgCpu ?? 0}%`, label: "Average" },
      ]}
    />
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

    const res = await fetch(`${baseUrl}/api/4/cores`, { headers })
    if (!res.ok) throw new Error(`Glances error: ${res.status}`)

    const cores = await res.json()
    const coreList = Array.isArray(cores) ? cores : Object.values(cores)

    const cpuValues = coreList.map((c: { cpu: number }) => c.cpu ?? 0)
    const maxCore = Math.max(...cpuValues, 0)
    const avgCpu =
      cpuValues.length > 0
        ? cpuValues.reduce((a: number, b: number) => a + b, 0) /
          cpuValues.length
        : 0

    return {
      _status: "ok",
      cores: coreList.length,
      maxCore: Math.round(maxCore),
      avgCpu: Math.round(avgCpu),
    }
  },
  Widget: GlancesPerCpuWidget,
}
