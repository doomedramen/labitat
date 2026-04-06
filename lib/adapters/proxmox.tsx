import type { ServiceDefinition } from "./types"
import { StatGrid } from "./widgets"

type ProxmoxData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  vms: string
  lxc: string
  cpu: string
  memory: string
}

type ProxmoxVM = {
  type: "qemu"
  template: number
  node: string
  status: string
  vmid: number
  name?: string
}

type ProxmoxLXC = {
  type: "lxc"
  template: number
  node: string
  status: string
  vmid: number
  name?: string
}

type ProxmoxNode = {
  type: "node"
  node: string
  status: string
  maxcpu: number
  cpu: number
  maxmem: number
  mem: number
}

type ProxmoxResource = ProxmoxVM | ProxmoxLXC | ProxmoxNode

function ProxmoxWidget({ vms, lxc, cpu, memory }: ProxmoxData) {
  const items = [
    { value: vms, label: "VMs" },
    { value: lxc, label: "LXC" },
    { value: cpu, label: "CPU" },
    { value: memory, label: "Memory" },
  ]

  return <StatGrid items={items} />
}

export const proxmoxDefinition: ServiceDefinition<ProxmoxData> = {
  id: "proxmox",
  name: "Proxmox VE",
  icon: "proxmox",
  category: "monitoring",
  defaultPollingMs: 30_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://proxmox.local:8006",
      helperText: "Proxmox VE API URL",
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: true,
      placeholder: "root@pam",
      helperText: "Proxmox username (e.g., root@pam)",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: true,
      placeholder: "Your password",
      helperText: "Proxmox password",
    },
    {
      key: "node",
      label: "Node (optional)",
      type: "text",
      required: false,
      placeholder: "pve",
      helperText:
        "Specific node name to filter. Leave blank to show all nodes.",
    },
  ],

  async fetchData(config) {
    const { url, username, password, node } = config

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

    // Get cluster resources
    const resourcesRes = await fetch(`${baseUrl}/api2/json/cluster/resources`, {
      headers: {
        Cookie: `PVEAuthCookie=${ticket}`,
        CSRFPreventionToken: csrfToken,
      },
    })

    if (!resourcesRes.ok) {
      throw new Error(`Failed to fetch resources: ${resourcesRes.status}`)
    }

    const resourcesData = await resourcesRes.json()
    const data = resourcesData.data

    // Filter by node if specified
    const vms = data.filter(
      (item: ProxmoxResource): item is ProxmoxVM =>
        item.type === "qemu" &&
        item.template === 0 &&
        (!node || item.node === node)
    )

    const lxc = data.filter(
      (item: ProxmoxResource): item is ProxmoxLXC =>
        item.type === "lxc" &&
        item.template === 0 &&
        (!node || item.node === node)
    )

    const nodes = data.filter(
      (item: ProxmoxResource): item is ProxmoxNode =>
        item.type === "node" &&
        item.status === "online" &&
        (!node || item.node === node)
    )

    const runningVMs = vms.filter((vm) => vm.status === "running").length
    const runningLXC = lxc.filter((c) => c.status === "running").length

    // Calculate resource usage if we have nodes
    let cpuPercent = "0%"
    let memoryPercent = "0%"

    if (nodes.length > 0) {
      const maxMemory = nodes.reduce((sum, n) => n.maxmem + sum, 0)
      const usedMemory = nodes.reduce((sum, n) => n.mem + sum, 0)
      const maxCpu = nodes.reduce((sum, n) => n.maxcpu + sum, 0)
      const usedCpu = nodes.reduce((sum, n) => n.cpu * n.maxcpu + sum, 0)

      cpuPercent = `${((usedCpu / maxCpu) * 100).toFixed(1)}%`
      memoryPercent = `${((usedMemory / maxMemory) * 100).toFixed(1)}%`
    }

    return {
      _status: "ok" as const,
      vms: `${runningVMs} / ${vms.length}`,
      lxc: `${runningLXC} / ${lxc.length}`,
      cpu: cpuPercent,
      memory: memoryPercent,
    }
  },

  Widget: ProxmoxWidget,
}
