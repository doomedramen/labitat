import type { ServiceDefinition } from "./types"
import { StatGrid } from "./widgets"

type ProxmoxBackupServerData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  datastoreUsage: string
  failedTasks: string
  cpuUsage: string
  memoryUsage: string
}

type PBSDatastore = {
  store: string
  used: number
  total: number
}

function ProxmoxBackupServerWidget({
  datastoreUsage,
  failedTasks,
  cpuUsage,
  memoryUsage,
}: ProxmoxBackupServerData) {
  const items = [
    { value: datastoreUsage, label: "Datastore" },
    { value: failedTasks, label: "Failed (24h)" },
    { value: cpuUsage, label: "CPU" },
    { value: memoryUsage, label: "Memory" },
  ]

  return <StatGrid items={items} />
}

export const proxmoxBackupServerDefinition: ServiceDefinition<ProxmoxBackupServerData> =
  {
    id: "proxmox-backup-server",
    name: "Proxmox Backup Server",
    icon: "proxmox",
    category: "monitoring",
    defaultPollingMs: 30_000,

    configFields: [
      {
        key: "url",
        label: "URL",
        type: "url",
        required: true,
        placeholder: "https://pbs.local:8007",
        helperText: "Proxmox Backup Server API URL",
      },
      {
        key: "username",
        label: "Username",
        type: "text",
        required: true,
        placeholder: "root@pam",
        helperText: "PBS username (e.g., root@pam)",
      },
      {
        key: "password",
        label: "Password",
        type: "password",
        required: true,
        placeholder: "Your password",
        helperText: "PBS password",
      },
      {
        key: "datastore",
        label: "Datastore (optional)",
        type: "text",
        required: false,
        placeholder: "backup",
        helperText:
          "Specific datastore name to monitor. Leave blank to show aggregate.",
      },
    ],

    async fetchData(config) {
      const { url, username, password, datastore } = config

      if (!url || !username || !password) {
        throw new Error("URL, username, and password are required")
      }

      const baseUrl = url.replace(/\/$/, "")

      // Get API ticket
      const ticketRes = await fetch(`${baseUrl}/api2/json/access/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username,
          password,
        }),
      })

      if (!ticketRes.ok) {
        throw new Error(`Authentication failed: ${ticketRes.status}`)
      }

      const ticketData = await ticketRes.json()
      const ticket = ticketData.data.ticket
      const csrfToken = ticketData.data.CSRFPreventionToken

      const headers = {
        Cookie: `PVEAuthCookie=${ticket}`,
        CSRFPreventionToken: csrfToken,
      }

      // Fetch datastore usage
      const datastoreRes = await fetch(
        `${baseUrl}/api2/json/status/datastore-usage`,
        { headers }
      )

      if (!datastoreRes.ok) {
        throw new Error(
          `Failed to fetch datastore usage: ${datastoreRes.status}`
        )
      }

      const datastoreData = await datastoreRes.json()

      // Fetch recent tasks
      const since = Date.now() - 24 * 60 * 60 * 1000
      const tasksRes = await fetch(
        `${baseUrl}/api2/json/nodes/localhost/tasks?errors=true&limit=100&since=${since}`,
        { headers }
      )

      if (!tasksRes.ok) {
        throw new Error(`Failed to fetch tasks: ${tasksRes.status}`)
      }

      const tasksData = await tasksRes.json()

      // Fetch host status
      const hostRes = await fetch(
        `${baseUrl}/api2/json/nodes/localhost/status`,
        { headers }
      )

      if (!hostRes.ok) {
        throw new Error(`Failed to fetch host status: ${hostRes.status}`)
      }

      const hostData = await hostRes.json()

      // Calculate datastore usage
      const datastores = datastoreData.data
      let datastoreUsage = "0%"

      if (datastore) {
        const dsIndex = datastores.findIndex(
          (ds: PBSDatastore) => ds.store === datastore
        )
        if (dsIndex > -1) {
          const ds = datastores[dsIndex]
          datastoreUsage = `${((ds.used / ds.total) * 100).toFixed(1)}%`
        }
      } else {
        const totalUsed = datastores.reduce(
          (sum: number, ds: PBSDatastore) => sum + ds.used,
          0
        )
        const totalCapacity = datastores.reduce(
          (sum: number, ds: PBSDatastore) => sum + ds.total,
          0
        )
        datastoreUsage = `${((totalUsed / totalCapacity) * 100).toFixed(1)}%`
      }

      // Get CPU and memory usage
      const cpuUsage = `${(hostData.data.cpu * 100).toFixed(1)}%`
      const memoryUsage = `${(
        (hostData.data.memory.used / hostData.data.memory.total) *
        100
      ).toFixed(1)}%`

      // Get failed tasks count
      const failedTasks =
        tasksData.total >= 100 ? "99+" : tasksData.total.toString()

      return {
        _status: "ok" as const,
        datastoreUsage,
        failedTasks,
        cpuUsage,
        memoryUsage,
      }
    },

    Widget: ProxmoxBackupServerWidget,
  }
