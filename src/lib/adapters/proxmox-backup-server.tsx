import type { ServiceDefinition } from "./types"
import { formatBytes } from "@/lib/utils/format"
import {
  Database,
  Camera,
  HardDrive,
  AlertTriangle,
  Cpu,
  MemoryStick,
} from "lucide-react"

type ProxmoxBackupServerData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  datastores: number
  snapshots: number
  usedSpace: string
  totalSpace: string
  usagePercent: number // datastore usage percentage
  cpuUsage: number // percentage 0-100
  memoryUsage: number // percentage 0-100
  memoryUsed: string // human readable
  memoryTotal: string // human readable
  failedTasks: number // failed tasks in last 24h
}
import { fetchWithTimeout } from "./fetch-with-timeout"

function proxmoxBackupServerToPayload(data: ProxmoxBackupServerData) {
  return {
    stats: [
      {
        id: "stores",
        value: data.datastores ?? 0,
        label: "Stores",
        icon: Database,
      },
      {
        id: "snaps",
        value: data.snapshots ?? 0,
        label: "Snaps",
        icon: Camera,
      },
      {
        id: "usage",
        value: `${(data.usagePercent ?? 0).toFixed(1)}%`,
        label: "Usage",
        icon: HardDrive,
        tooltip: `${data.usedSpace ?? "0 B"} / ${data.totalSpace ?? "0 B"}`,
      },
      {
        id: "failed",
        value: data.failedTasks >= 100 ? "99+" : String(data.failedTasks),
        label: "Failed",
        icon: AlertTriangle,
        tooltip: "Failed tasks (24h)",
      },
      {
        id: "cpu",
        value: `${(data.cpuUsage ?? 0).toFixed(1)}%`,
        label: "CPU",
        icon: Cpu,
      },
      {
        id: "memory",
        value: `${(data.memoryUsage ?? 0).toFixed(1)}%`,
        label: "Memory",
        icon: MemoryStick,
        tooltip: `${data.memoryUsed ?? "0 B"} / ${data.memoryTotal ?? "0 B"}`,
      },
    ],
    // Default to 4 stats: hide CPU and Memory
    defaultActiveIds: ["stores", "snaps", "usage", "failed"],
  }
}

export const proxmoxBackupServerDefinition: ServiceDefinition<ProxmoxBackupServerData> =
  {
    id: "proxmox-backup-server",
    name: "Proxmox Backup Server",
    icon: "proxmox-backup-server",
    category: "storage",
    defaultPollingMs: 15_000,
    configFields: [
      {
        key: "url",
        label: "URL",
        type: "url",
        required: true,
        placeholder: "https://pbs.example.org:8007",
      },
      {
        key: "username",
        label: "Username",
        type: "text",
        required: true,
        placeholder: "root@pam",
      },
      {
        key: "password",
        label: "Password",
        type: "password",
        required: true,
        placeholder: "Your PBS password",
      },
    ],
    async fetchData(config) {
      const baseUrl = config.url.replace(/\/$/, "")

      // Login
      const loginRes = await fetchWithTimeout(
        `${baseUrl}/api2/json/access/ticket`,
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            username: config.username,
            password: config.password,
          }),
        }
      )

      if (!loginRes.ok) throw new Error(`PBS login failed: ${loginRes.status}`)

      const loginData = await loginRes.json()
      const ticket = loginData.data?.ticket
      const csrfToken = loginData.data?.CSRFPreventionToken
      if (!ticket) throw new Error("PBS login succeeded but no ticket returned")
      const headers = {
        Cookie: `PBSAuthCookie=${ticket}`,
        CSRFPreventionToken: csrfToken,
      }

      // Get datastores, host status, and recent tasks in parallel
      const [dsRes, statusRes, tasksRes] = await Promise.all([
        fetchWithTimeout(`${baseUrl}/api2/json/admin/datastore`, { headers }),
        fetchWithTimeout(`${baseUrl}/api2/json/nodes/localhost/status`, {
          headers,
        }),
        fetchWithTimeout(
          `${baseUrl}/api2/json/nodes/localhost/tasks?errors-only=1&limit=100`,
          { headers }
        ),
      ])

      if (!dsRes.ok) throw new Error(`PBS error: ${dsRes.status}`)

      const datastores = await dsRes.json()
      const dsList = datastores.data ?? []

      // Aggregate datastore usage
      let totalUsed = 0
      let totalSpace = 0
      let totalSnapshots = 0

      for (const ds of dsList) {
        totalUsed += ds.used ?? 0
        totalSpace += ds.total ?? 0

        // Count snapshots for each datastore
        try {
          const snapRes = await fetchWithTimeout(
            `${baseUrl}/api2/json/admin/datastore/${ds.store}/snapshots`,
            { headers }
          )
          if (snapRes.ok) {
            const snapData = await snapRes.json()
            totalSnapshots += snapData.data?.length ?? 0
          }
        } catch {
          // Ignore errors for individual datastore snapshots
        }
      }

      const usagePercent = totalSpace > 0 ? (totalUsed / totalSpace) * 100 : 0

      // Get host CPU and memory status
      let cpuUsage = 0
      let memoryUsage = 0
      let memoryUsed = "0 B"
      let memoryTotal = "0 B"

      if (statusRes.ok) {
        const statusData = await statusRes.json()
        const status = statusData.data ?? {}

        cpuUsage = (status.cpu ?? 0) * 100 // PBS returns CPU as 0-1 fraction
        const memUsed = status.memory?.used ?? 0
        const memTotal = status.memory?.total ?? 0
        memoryUsage = memTotal > 0 ? (memUsed / memTotal) * 100 : 0
        memoryUsed = formatBytes(memUsed)
        memoryTotal = formatBytes(memTotal)
      }

      // Count failed tasks (last 24h, errors only)
      let failedTasks = 0
      if (tasksRes.ok) {
        const tasksData = await tasksRes.json()
        const tasks = tasksData.data ?? []
        failedTasks = tasks.length
      }

      return {
        _status: "ok",
        datastores: dsList.length,
        snapshots: totalSnapshots,
        usedSpace: formatBytes(totalUsed),
        totalSpace: formatBytes(totalSpace),
        usagePercent,
        cpuUsage,
        memoryUsage,
        memoryUsed,
        memoryTotal,
        failedTasks,
      }
    },
    toPayload: proxmoxBackupServerToPayload,
  }
