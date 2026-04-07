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
  avail: number
  total: number
}

type PBSTask = {
  type: string
  status: string
  starttime?: number
  endtime?: number
}

type PBSNodeStatus = {
  cpu: number
  memory: {
    used: number
    total: number
  }
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
        placeholder: "https://proxmox-backup-server.example.org",
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
        placeholder: "Your Proxmox Backup Server password",
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

      try {
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
          const errorText = await ticketRes.text()
          throw new Error(
            `Authentication failed: ${ticketRes.status} ${errorText}`
          )
        }

        const ticketData = await ticketRes.json()
        const ticket = ticketData.data.ticket
        const csrfToken = ticketData.data.CSRFPreventionToken

        const authHeaders = {
          Cookie: `PVEAuthCookie=${ticket}`,
          CSRFPreventionToken: csrfToken,
        }

        // Fetch datastore usage
        const datastoreRes = await fetch(
          `${baseUrl}/api2/json/admin/datastore`,
          { headers: authHeaders }
        )

        let datastoreUsage = "0%"
        if (datastoreRes.ok) {
          const datastoreData = await datastoreRes.json()
          const datastores = (datastoreData.data as PBSDatastore[]) || []

          if (datastores.length > 0) {
            if (datastore) {
              const ds = datastores.find(
                (d: PBSDatastore) => d.store === datastore
              )
              if (ds && ds.total > 0) {
                datastoreUsage = `${((ds.used / ds.total) * 100).toFixed(1)}%`
              } else {
                datastoreUsage = "N/A"
              }
            } else {
              const totalUsed = datastores.reduce(
                (sum: number, ds: PBSDatastore) => sum + (ds.used || 0),
                0
              )
              const totalCapacity = datastores.reduce(
                (sum: number, ds: PBSDatastore) => sum + (ds.total || 0),
                0
              )
              if (totalCapacity > 0) {
                datastoreUsage = `${((totalUsed / totalCapacity) * 100).toFixed(1)}%`
              }
            }
          }
        }

        // Fetch node status for CPU and memory
        // PBS typically has only one node, we need to get the node name first
        let cpuUsage = "0%"
        let memoryUsage = "0%"

        try {
          // Try to get node name from /api2/json/nodes endpoint
          const nodesRes = await fetch(`${baseUrl}/api2/json/nodes`, {
            headers: authHeaders,
          })

          if (nodesRes.ok) {
            const nodesData = await nodesRes.json()
            const nodes = nodesData.data || []

            if (nodes.length > 0) {
              const nodeName = nodes[0].node

              // Fetch node status for CPU and memory
              const statusRes = await fetch(
                `${baseUrl}/api2/json/nodes/${nodeName}/status`,
                { headers: authHeaders }
              )

              if (statusRes.ok) {
                const statusData = await statusRes.json()
                const status = statusData.data as PBSNodeStatus

                if (status.cpu !== undefined) {
                  cpuUsage = `${(status.cpu * 100).toFixed(1)}%`
                }

                if (status.memory?.total > 0) {
                  memoryUsage = `${(
                    (status.memory.used / status.memory.total) *
                    100
                  ).toFixed(1)}%`
                }
              }
            }
          }
        } catch (error) {
          console.warn("Failed to fetch node status:", error)
          // Continue with default values
        }

        // Fetch recent tasks and count failed ones
        const since = Math.floor((Date.now() - 24 * 60 * 60 * 1000) / 1000)
        let failedTasks = "0"

        try {
          const tasksRes = await fetch(
            `${baseUrl}/api2/json/admin/tasks?since=${since}`,
            { headers: authHeaders }
          )

          if (tasksRes.ok) {
            const tasksData = await tasksRes.json()
            const tasks = tasksData.data || []

            const failedCount = tasks.filter(
              (task: PBSTask) =>
                task.status === "failed" || task.status === "error"
            ).length

            failedTasks = failedCount > 99 ? "99+" : failedCount.toString()
          }
        } catch (error) {
          console.warn("Failed to fetch tasks:", error)
          // Continue with default value
        }

        return {
          _status: "ok" as const,
          datastoreUsage,
          failedTasks,
          cpuUsage,
          memoryUsage,
        }
      } catch (error) {
        const errorMessage =
          error instanceof Error ? error.message : "Unknown error occurred"
        return {
          _status: "error" as const,
          _statusText: errorMessage,
          datastoreUsage: "N/A",
          failedTasks: "N/A",
          cpuUsage: "N/A",
          memoryUsage: "N/A",
        }
      }
    },

    Widget: ProxmoxBackupServerWidget,
  }
