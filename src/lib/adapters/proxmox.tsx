import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

type ProxmoxData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  nodes: number
  vms: number
  containers: number
  runningVMs: number
  runningContainers: number
}

function ProxmoxWidget({
  nodes,
  vms,
  containers,
  runningVMs,
  runningContainers,
}: ProxmoxData) {
  return (
    <StatGrid
      items={[
        { value: nodes ?? 0, label: "Nodes" },
        { value: `${runningVMs ?? 0}/${vms ?? 0}`, label: "VMs" },
        {
          value: `${runningContainers ?? 0}/${containers ?? 0}`,
          label: "LXCs",
        },
      ]}
    />
  )
}

export const proxmoxDefinition: ServiceDefinition<ProxmoxData> = {
  id: "proxmox",
  name: "Proxmox",
  icon: "proxmox",
  category: "monitoring",
  defaultPollingMs: 15_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://proxmox.example.org:8006",
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
      placeholder: "Your Proxmox password",
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

    if (!loginRes.ok)
      throw new Error(`Proxmox login failed: ${loginRes.status}`)

    const loginData = await loginRes.json()
    const ticket = loginData.data.ticket
    const csrfToken = loginData.data.CSRFPreventionToken

    // Get cluster resources
    const res = await fetch(`${baseUrl}/api2/json/cluster/resources`, {
      headers: {
        Cookie: `PVEAuthCookie=${ticket}`,
        CSRFPreventionToken: csrfToken,
      },
    })

    if (!res.ok) throw new Error(`Proxmox error: ${res.status}`)

    const data = await res.json()
    const resources = data.data ?? []

    const nodes = resources.filter(
      (r: { type: string }) => r.type === "node"
    ).length
    const vms = resources.filter(
      (r: { type: string }) => r.type === "qemu"
    ).length
    const containers = resources.filter(
      (r: { type: string }) => r.type === "lxc"
    ).length
    const runningVMs = resources.filter(
      (r: { type: string; status: string }) =>
        r.type === "qemu" && r.status === "running"
    ).length
    const runningContainers = resources.filter(
      (r: { type: string; status: string }) =>
        r.type === "lxc" && r.status === "running"
    ).length

    return {
      _status: "ok",
      nodes,
      vms,
      containers,
      runningVMs,
      runningContainers,
    }
  },
  Widget: ProxmoxWidget,
}
