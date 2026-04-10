import type { ServiceDefinition } from "./types"
import { formatBytes } from "@/lib/utils/format"
import { Server, Monitor, Container, Cpu, MemoryStick } from "lucide-react"

type ProxmoxData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  nodes: number
  vms: number
  containers: number
  runningVMs: number
  runningContainers: number
  cpuUsage: number // percentage 0-100
  memoryUsage: number // percentage 0-100
  memoryUsed: string // human readable
  memoryTotal: string // human readable
}
import { fetchWithTimeout } from "./fetch-with-timeout"

function proxmoxToPayload(data: ProxmoxData) {
  return {
    stats: [
      {
        id: "nodes",
        value: data.nodes ?? 0,
        label: "Nodes",
        icon: Server,
      },
      {
        id: "vms",
        value: `${data.runningVMs ?? 0}/${data.vms ?? 0}`,
        label: "VMs",
        icon: Monitor,
      },
      {
        id: "lxcs",
        value: `${data.runningContainers ?? 0}/${data.containers ?? 0}`,
        label: "LXCs",
        icon: Container,
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
  }
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
    {
      key: "node",
      label: "Node (optional)",
      type: "text",
      required: false,
      placeholder: "Leave empty for cluster-wide stats",
      helperText: "Specify a node name to filter resources (e.g., pve1)",
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

    if (!loginRes.ok)
      throw new Error(`Proxmox login failed: ${loginRes.status}`)

    const loginData = await loginRes.json()
    const ticket = loginData.data.ticket
    const csrfToken = loginData.data.CSRFPreventionToken

    // Get cluster resources
    const res = await fetchWithTimeout(
      `${baseUrl}/api2/json/cluster/resources`,
      {
        headers: {
          Cookie: `PVEAuthCookie=${ticket}`,
          CSRFPreventionToken: csrfToken,
        },
      }
    )

    if (!res.ok) throw new Error(`Proxmox error: ${res.status}`)

    const data = await res.json()
    const allResources = data.data ?? []
    const selectedNode = config.node?.trim()

    // Filter resources by node if specified
    const resources = selectedNode
      ? allResources.filter((r: { node?: string }) => r.node === selectedNode)
      : allResources

    const nodes = selectedNode
      ? 1
      : resources.filter((r: { type: string }) => r.type === "node").length
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

    // Calculate CPU and memory utilization from node-level resources only
    // Using node-level data avoids double-counting (VMs/containers run on nodes)
    let totalCpu = 0
    let totalCpuMax = 0
    let totalMem = 0
    let totalMemMax = 0

    resources.forEach(
      (r: {
        type: string
        cpu?: number
        maxcpu?: number
        mem?: number
        maxmem?: number
      }) => {
        if (r.type === "node") {
          totalCpu += r.cpu ?? 0
          totalCpuMax += r.maxcpu ?? 0
          totalMem += r.mem ?? 0
          totalMemMax += r.maxmem ?? 0
        }
      }
    )

    const cpuUsage = totalCpuMax > 0 ? (totalCpu / totalCpuMax) * 100 : 0
    const memoryUsage = totalMemMax > 0 ? (totalMem / totalMemMax) * 100 : 0

    return {
      _status: "ok",
      nodes,
      vms,
      containers,
      runningVMs,
      runningContainers,
      cpuUsage,
      memoryUsage,
      memoryUsed: formatBytes(totalMem),
      memoryTotal: formatBytes(totalMemMax),
    }
  },
  toPayload: proxmoxToPayload,
}
