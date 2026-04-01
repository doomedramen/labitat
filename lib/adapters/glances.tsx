import type { ServiceDefinition } from "./types"
import {
  Cpu,
  MemoryStick,
  HardDrive,
  Clock,
  Activity,
  Download,
  Upload,
  Thermometer,
} from "lucide-react"

type GlancesData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  cpuPercent?: number
  memoryPercent?: number
  cpuTemp?: number
  diskPercent?: number
  diskUsed?: number
  diskTotal?: number
  uptime?: number
  load?: number[]
  networkRx?: number
  networkTx?: number
  showCpu: boolean
  showMem: boolean
  showCpuTemp: boolean
  showUptime: boolean
  showDisk: boolean
  showNetwork: boolean
  diskPath: string
  diskUnits: string
}

function GlancesWidget({
  cpuPercent,
  memoryPercent,
  cpuTemp,
  diskPercent,
  diskUsed,
  diskTotal,
  uptime,
  load,
  networkRx,
  networkTx,
  showCpu,
  showMem,
  showCpuTemp,
  showUptime,
  showDisk,
  showNetwork,
  diskUnits,
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
    if (diskUnits === "bytes") {
      const gb = bytes / 1024 / 1024 / 1024
      if (gb >= 1) return `${gb.toFixed(2)} GB`
      const mb = bytes / 1024 / 1024
      return `${mb.toFixed(2)} MB`
    }
    return `${bytes.toFixed(2)} ${diskUnits}`
  }

  const getStatusColor = (value: number) => {
    if (value < 70) return "text-green-500"
    if (value < 85) return "text-amber-500"
    return "text-red-500"
  }

  const stats = [
    showCpu &&
      cpuPercent !== undefined && {
        icon: <Cpu className={`size-3 ${getStatusColor(cpuPercent)}`} />,
        value: `${cpuPercent.toFixed(1)}%`,
        label: "CPU",
        color: getStatusColor(cpuPercent),
      },
    showMem &&
      memoryPercent !== undefined && {
        icon: (
          <MemoryStick className={`size-3 ${getStatusColor(memoryPercent)}`} />
        ),
        value: `${memoryPercent.toFixed(1)}%`,
        label: "RAM",
        color: getStatusColor(memoryPercent),
      },
    showCpuTemp &&
      cpuTemp !== undefined && {
        icon: <Thermometer className="size-3 text-muted-foreground" />,
        value: `${cpuTemp.toFixed(1)}°C`,
        label: "Temp",
        color: "text-foreground",
      },
    showDisk &&
      diskPercent !== undefined && {
        icon: <HardDrive className={`size-3 ${getStatusColor(diskPercent)}`} />,
        value: `${diskPercent.toFixed(1)}%`,
        label: "Disk",
        color: getStatusColor(diskPercent),
      },
  ].filter(Boolean) as Array<{
    icon: React.ReactNode
    value: string
    label: string
    color: string
  }>

  const cols = stats.length > 0 ? Math.min(stats.length, 4) : 1

  return (
    <div className="space-y-2">
      {stats.length > 0 && (
        <div
          className="grid gap-2 text-xs"
          style={{ gridTemplateColumns: `repeat(${cols}, 1fr)` }}
        >
          {stats.map((stat) => (
            <div
              key={stat.label}
              className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1.5 text-center"
            >
              <div className="mb-0.5">{stat.icon}</div>
              <span className={`font-medium tabular-nums ${stat.color}`}>
                {stat.value}
              </span>
              <span className="text-muted-foreground">{stat.label}</span>
            </div>
          ))}
        </div>
      )}

      {showUptime && uptime !== undefined && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Clock className="size-3" />
          <span>Uptime: {formatUptime(uptime)}</span>
        </div>
      )}

      {load && load.length > 0 && (
        <div className="flex items-center gap-1 text-xs text-muted-foreground">
          <Activity className="size-3" />
          <span>Load: {load.map((l) => l.toFixed(2)).join(" / ")}</span>
        </div>
      )}

      {showNetwork && (networkRx !== undefined || networkTx !== undefined) && (
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
      placeholder: "http://glances.home.lab:61208",
      helperText: "The base URL of your Glances instance",
    },
    {
      key: "version",
      label: "API Version",
      type: "select",
      required: false,
      options: [
        { label: "v4 (default)", value: "4" },
        { label: "v3", value: "3" },
      ],
      helperText: "Glances API version",
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
    {
      key: "showCpu",
      label: "Show CPU",
      type: "boolean",
      helperText: "Display CPU usage",
    },
    {
      key: "showMem",
      label: "Show Memory",
      type: "boolean",
      helperText: "Display memory usage",
    },
    {
      key: "showCpuTemp",
      label: "Show CPU Temp",
      type: "boolean",
      helperText: "Display CPU temperature if available",
    },
    {
      key: "showUptime",
      label: "Show Uptime",
      type: "boolean",
      helperText: "Display system uptime",
    },
    {
      key: "diskPath",
      label: "Disk Path",
      type: "text",
      required: false,
      placeholder: "/",
      helperText: "Disk mount point to monitor (default: /)",
    },
    {
      key: "diskUnits",
      label: "Disk Units",
      type: "select",
      required: false,
      options: [
        { label: "Auto (bytes)", value: "bytes" },
        { label: "MB", value: "MB" },
        { label: "GB", value: "GB" },
      ],
      helperText: "Units for disk usage display",
    },
    {
      key: "showDisk",
      label: "Show Disk",
      type: "boolean",
      helperText: "Display disk usage",
    },
    {
      key: "showNetwork",
      label: "Show Network",
      type: "boolean",
      helperText: "Display network I/O",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const version = config.version || "4"
    const headers: HeadersInit = {
      Accept: "application/json",
    }

    if (config.username && config.password) {
      const credentials = btoa(`${config.username}:${config.password}`)
      headers.Authorization = `Basic ${credentials}`
    }

    const res = await fetch(`${baseUrl}/api/${version}/quicklook`, { headers })

    if (!res.ok) {
      if (res.status === 401) throw new Error("Authentication failed")
      if (res.status === 404) throw new Error("Glances API not found")
      throw new Error(`Glances error: ${res.status}`)
    }

    const data = await res.json()

    let diskPercent = data.fs?.[0]?.percent ?? data.disk ?? 0
    let diskUsed = data.fs?.[0]?.used
    let diskTotal = data.fs?.[0]?.total

    if (config.diskPath && data.fs) {
      const diskInfo = data.fs.find(
        (d: { mount_point?: string }) => d.mount_point === config.diskPath
      )
      if (diskInfo) {
        diskPercent = diskInfo.percent ?? 0
        diskUsed = diskInfo.used
        diskTotal = diskInfo.total
      }
    }

    return {
      _status: "ok" as const,
      cpuPercent: data.cpu?.total ?? data.cpu,
      memoryPercent: data.mem?.percent ?? data.mem,
      cpuTemp: data.cputemp,
      diskPercent,
      diskUsed,
      diskTotal,
      uptime: data.uptime ?? 0,
      load:
        data.load?.[0] !== undefined
          ? [data.load[0], data.load[1] ?? 0, data.load[2] ?? 0]
          : undefined,
      networkRx: data.network?.[0]?.rx,
      networkTx: data.network?.[0]?.tx,
      showCpu: config.showCpu !== "false",
      showMem: config.showMem !== "false",
      showCpuTemp: config.showCpuTemp === "true",
      showUptime: config.showUptime !== "false",
      showDisk: config.showDisk !== "false",
      showNetwork: config.showNetwork === "true",
      diskPath: config.diskPath || "/",
      diskUnits: config.diskUnits || "bytes",
    }
  },

  Widget: GlancesWidget,
}
