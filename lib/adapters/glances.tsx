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
}

function GlancesWidget({
  cpuPercent,
  memoryPercent,
  cpuTemp,
  diskPercent,
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
    if (bytes >= 1e15) return `${(bytes / 1e15).toFixed(1)} PB`
    if (bytes >= 1e12) return `${(bytes / 1e12).toFixed(1)} TB`
    if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(1)} GB`
    if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(1)} MB`
    if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(1)} KB`
    return `${bytes} B`
  }

  const getStatusColor = (value: number) => {
    if (value < 70) return "text-green-500"
    if (value < 85) return "text-amber-500"
    return "text-red-500"
  }

  const getTempColor = (celsius: number) => {
    if (celsius < 70) return "text-green-500"
    if (celsius < 85) return "text-amber-500"
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
        icon: <Thermometer className={`size-3 ${getTempColor(cpuTemp)}`} />,
        value: `${cpuTemp.toFixed(1)}°C`,
        label: "Temp",
        color: getTempColor(cpuTemp),
      },
    showDisk &&
      diskPercent !== undefined && {
        icon: <HardDrive className={`size-3 ${getStatusColor(diskPercent)}`} />,
        value: `${diskPercent.toFixed(1)}%`,
        label: "Disk",
        color: getStatusColor(diskPercent),
      },
    showUptime &&
      uptime !== undefined && {
        icon: <Clock className="size-3 text-muted-foreground" />,
        value: formatUptime(uptime),
        label: "Uptime",
        color: "text-foreground",
      },
    load &&
      load.length > 0 && {
        icon: <Activity className="size-3 text-muted-foreground" />,
        value: load[0].toFixed(2),
        label: "Load",
        color: "text-foreground",
      },
    showNetwork &&
      networkRx !== undefined && {
        icon: <Download className="size-3 text-muted-foreground" />,
        value: formatBytes(networkRx),
        label: "Rx",
        color: "text-foreground",
      },
    showNetwork &&
      networkTx !== undefined && {
        icon: <Upload className="size-3 text-muted-foreground" />,
        value: formatBytes(networkTx),
        label: "Tx",
        color: "text-foreground",
      },
  ].filter(Boolean) as Array<{
    icon: React.ReactNode
    value: string
    label: string
    color: string
  }>

  if (stats.length === 0) return null

  const cols = Math.min(stats.length, 4)

  return (
    <div
      className="grid gap-1.5 text-xs"
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
    const headers: HeadersInit = { Accept: "application/json" }

    if (config.username && config.password) {
      const credentials = btoa(`${config.username}:${config.password}`)
      headers.Authorization = `Basic ${credentials}`
    }

    const get = async (path: string) => {
      const res = await fetch(`${baseUrl}/api/${version}/${path}`, { headers })
      if (!res.ok) {
        if (res.status === 401) throw new Error("Authentication failed")
        if (res.status === 404) throw new Error("Glances API not found")
        throw new Error(`Glances error: ${res.status}`)
      }
      return res.json()
    }

    const showCpuTemp = config.showCpuTemp === "true"
    const showNetwork = config.showNetwork === "true"

    const [
      cpuData,
      memData,
      loadData,
      fsData,
      uptimeRaw,
      sensorsData,
      networkData,
    ] = await Promise.all([
      get("cpu"),
      get("mem"),
      get("load"),
      get("fs"),
      get("uptime"),
      showCpuTemp ? get("sensors") : Promise.resolve(null),
      showNetwork ? get("network") : Promise.resolve(null),
    ])

    // Parse uptime string: "1 day, 5:23:45.123456" or "5:23:45.123456"
    const parseUptime = (raw: string): number => {
      let days = 0
      let timeStr = raw
      const dayMatch = raw.match(/(\d+)\s+day[s]?,\s*(.+)/)
      if (dayMatch) {
        days = parseInt(dayMatch[1], 10)
        timeStr = dayMatch[2]
      }
      const timeParts = timeStr.split(":").map((p) => parseFloat(p))
      return (
        (timeParts[0] ?? 0) * 3600 +
        (timeParts[1] ?? 0) * 60 +
        (timeParts[2] ?? 0) +
        days * 86400
      )
    }

    const uptimeSeconds =
      typeof uptimeRaw === "string" ? parseUptime(uptimeRaw) : (uptimeRaw ?? 0)

    // CPU temp: average of temperature_core sensors with CPU-related labels
    const cpuSensorLabels = ["cpu_thermal", "Core", "Tctl", "Temperature"]
    const cpuSensors = Array.isArray(sensorsData)
      ? sensorsData.filter(
          (s: { label: string; type: string }) =>
            cpuSensorLabels.some((l) => s.label?.startsWith(l)) &&
            s.type === "temperature_core"
        )
      : []
    const cpuTemp =
      cpuSensors.length > 0
        ? cpuSensors.reduce(
            (acc: number, s: { value: number }) => acc + s.value,
            0
          ) / cpuSensors.length
        : undefined

    const diskPath = config.diskPath || "/"
    const fsList: unknown[] = Array.isArray(fsData)
      ? fsData
      : typeof fsData === "object" && fsData !== null
        ? Object.values(fsData)
        : []
    type FsEntry = {
      mnt_point?: string
      percent?: number
      used?: number
      size?: number
    }
    const diskEntry =
      (fsList as FsEntry[]).find((d) => d.mnt_point === diskPath) ??
      (fsList[0] as FsEntry | undefined)

    // Network: sum rx/tx across all interfaces (bytes/s)
    const networkList = Array.isArray(networkData) ? networkData : []
    type NetEntry = { rx: number; tx: number; interface_name?: string }
    const filteredNet = (networkList as NetEntry[]).filter(
      (n) => n.interface_name !== "lo"
    )
    const networkRx =
      filteredNet.length > 0
        ? filteredNet.reduce((acc, n) => acc + (n.rx ?? 0), 0)
        : undefined
    const networkTx =
      filteredNet.length > 0
        ? filteredNet.reduce((acc, n) => acc + (n.tx ?? 0), 0)
        : undefined

    return {
      _status: "ok" as const,
      cpuPercent: cpuData.total,
      memoryPercent: memData.percent,
      cpuTemp,
      diskPercent: diskEntry?.percent ?? 0,
      diskUsed: diskEntry?.used,
      diskTotal: diskEntry?.size,
      uptime: uptimeSeconds,
      load:
        loadData?.min1 !== undefined
          ? [loadData.min1, loadData.min5 ?? 0, loadData.min15 ?? 0]
          : undefined,
      networkRx,
      networkTx,
      showCpu: config.showCpu !== "false",
      showMem: config.showMem !== "false",
      showCpuTemp,
      showUptime: config.showUptime !== "false",
      showDisk: config.showDisk !== "false",
      showNetwork,
      diskPath,
    }
  },

  Widget: GlancesWidget,
}
