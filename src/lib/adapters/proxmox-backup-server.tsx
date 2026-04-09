import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

type ProxmoxBackupServerData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  datastores: number
  snapshots: number
  usedSpace: string
  totalSpace: string
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function ProxmoxBackupServerWidget({
  datastores,
  snapshots,
  usedSpace,
  totalSpace,
}: ProxmoxBackupServerData) {
  return (
    <StatGrid
      items={[
        { value: datastores ?? 0, label: "Stores" },
        { value: snapshots ?? 0, label: "Snaps" },
        { value: usedSpace ?? "—", label: "Used" },
        { value: totalSpace ?? "—", label: "Total" },
      ]}
    />
  )
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
      const loginRes = await fetch(`${baseUrl}/api2/json/access/ticket`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          username: config.username,
          password: config.password,
        }),
      })

      if (!loginRes.ok) throw new Error(`PBS login failed: ${loginRes.status}`)

      const loginData = await loginRes.json()
      const ticket = loginData.data.ticket
      const csrfToken = loginData.data.CSRFPreventionToken
      const headers = {
        Cookie: `PBSAuthCookie=${ticket}`,
        CSRFPreventionToken: csrfToken,
      }

      // Get datastores
      const dsRes = await fetch(`${baseUrl}/api2/json/admin/datastore`, {
        headers,
      })
      if (!dsRes.ok) throw new Error(`PBS error: ${dsRes.status}`)

      const datastores = await dsRes.json()
      const dsList = datastores.data ?? []

      let totalUsed = 0
      let totalSpace = 0

      for (const ds of dsList) {
        totalUsed += ds.used ?? 0
        totalSpace += ds.total ?? 0
      }

      // Get snapshot count from first datastore
      let snapshots = 0
      if (dsList.length > 0) {
        const snapRes = await fetch(
          `${baseUrl}/api2/json/admin/datastore/${dsList[0].store}/snapshots`,
          { headers }
        )
        if (snapRes.ok) {
          const snapData = await snapRes.json()
          snapshots = snapData.data?.length ?? 0
        }
      }

      return {
        _status: "ok",
        datastores: dsList.length,
        snapshots,
        usedSpace: formatBytes(totalUsed),
        totalSpace: formatBytes(totalSpace),
      }
    },
    Widget: ProxmoxBackupServerWidget,
  }
