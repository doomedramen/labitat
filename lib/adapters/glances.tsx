import type { ServiceDefinition } from "./types"
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Clock,
  Activity,
  Download,
  Upload,
} from "lucide-react"

type GlancesData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  cpuPercent: number
  memoryPercent: number
  diskPercent: number
  uptime: number
  load?: number[]
  networkRx?: number
  networkTx?: number
}

function GlancesWidget({
  cpuPercent,
  memoryPercent,
  diskPercent,
  uptime,
  load,
  networkRx,
  networkTx,
}: GlancesData) {
  const formatUptime = (seconds: number) => {
    const days = Math.floor(seconds / 86400)
    const hours = Math.floor((seconds % 86400) / 3600)
    const mins = Math.floor((seconds % 3600) / 60)

    if (days > 0) return `${days}d ${hours}h`
    if (hours > 0) return `${hours}h ${mins}m`
    return `${mins}m`
  }

  const formatBytes = (bytes?: number) => {
    if (bytes === undefined) return ""
    const gb = bytes / 1024 / 1024 / 1024
    if (gb >= 1) return `${gb.toFixed(2)} GB`
    const mb = bytes / 1024 / 1024
    return `${mb.toFixed(2)} MB`
  }

  const getStatusColor = (value: number) => {
    if (value < 70) return "text-green-500"
    if (value < 85) return "text-amber-500"
    return "text-red-500"
  }

  return (
    <div className="space-y-2">
      <div className="grid grid-cols-3 gap-2 text-xs">
        <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1.5 text-center">
          <Cpu className={`mb-0.5 size-3 ${getStatusColor(cpuPercent)}`} />
          <span
            className={`font-medium tabular-nums ${getStatusColor(cpuPercent)}`}
          >
            {cpuPercent.toFixed(1)}%
          </span>
          <span className="text-muted-foreground">CPU</span>
        </div>
        <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1.5 text-center">
          <MemoryStick
            className={`mb-0.5 size-3 ${getStatusColor(memoryPercent)}`}
          />
          <span
            className={`font-medium tabular-nums ${getStatusColor(memoryPercent)}`}
          >
            {memoryPercent.toFixed(1)}%
          </span>
          <span className="text-muted-foreground">RAM</span>
        </div>
        <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1.5 text-center">
          <HardDrive
            className={`mb-0.5 size-3 ${getStatusColor(diskPercent)}`}
          />
          <span
            className={`font-medium tabular-nums ${getStatusColor(diskPercent)}`}
          >
            {diskPercent.toFixed(1)}%
          </span>
          <span className="text-muted-foreground">Disk</span>
        </div>
      </div>

      <div className="flex items-center justify-between gap-2 text-xs">
        <div className="flex items-center gap-1 text-muted-foreground">
          <Clock className="size-3" />
          <span>Uptime: {formatUptime(uptime)}</span>
        </div>
        {load && load.length > 0 && (
          <div className="flex items-center gap-1 text-muted-foreground">
            <Activity className="size-3" />
            <span>Load: {load.map((l) => l.toFixed(2)).join(" / ")}</span>
          </div>
        )}
      </div>

      {(networkRx !== undefined || networkTx !== undefined) && (
        <div className="flex items-center justify-between gap-2 text-xs text-muted-foreground">
          {networkRx !== undefined && (
            <div className="flex items-center gap-1">
              <Download className="size-3" />
              <span>Rx: {formatBytes(networkRx)}</span>
            </div>
          )}
          {networkTx !== undefined && (
            <div className="flex items-center gap-1">
              <Upload className="size-3" />
              <span>Tx: {formatBytes(networkTx)}</span>
            </div>
          )}
        </div>
      )}
    </div>
  )
}

export const glancesDefinition: ServiceDefinition<GlancesData> = {
  id: "glances",
  name: "Glances",
  icon: "glances",
  category: "monitoring",
  defaultPollingMs: 10_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://glances.home.lab",
      helperText: "The base URL of your Glances instance",
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: false,
      placeholder: "admin",
      helperText: "Optional - only if authentication is enabled",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: false,
      placeholder: "Your Glances password",
      helperText: "Optional - only if authentication is enabled",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers: HeadersInit = {
      Accept: "application/json",
    }

    // Add basic auth if credentials provided
    if (config.username && config.password) {
      const credentials = btoa(`${config.username}:${config.password}`)
      headers.Authorization = `Basic ${credentials}`
    }

    const res = await fetch(`${baseUrl}/api/4/quicklook`, { headers })

    if (!res.ok) {
      if (res.status === 401) throw new Error("Authentication failed")
      if (res.status === 404) throw new Error("Glances API not found")
      throw new Error(`Glances error: ${res.status}`)
    }

    const data = await res.json()

    return {
      _status: "ok" as const,
      cpuPercent: data.cpu?.total ?? data.cpu ?? 0,
      memoryPercent: data.mem?.percent ?? data.mem ?? 0,
      diskPercent: data.fs?.[0]?.percent ?? data.disk ?? 0,
      uptime: data.uptime ?? 0,
      load:
        data.load?.[0] !== undefined
          ? [data.load[0], data.load[1] ?? 0, data.load[2] ?? 0]
          : undefined,
      networkRx: data.network?.[0]?.rx ?? undefined,
      networkTx: data.network?.[0]?.tx ?? undefined,
    }
  },

  Widget: GlancesWidget,
}
