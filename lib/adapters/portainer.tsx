import type { ServiceDefinition } from "./types"
import { StatGrid } from "./widgets"

type PortainerData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  running: number
  stopped: number
  total: number
}

function PortainerWidget({ running, stopped, total }: PortainerData) {
  const items = [
    { value: running.toLocaleString(), label: "Running" },
    { value: stopped.toLocaleString(), label: "Stopped" },
    { value: total.toLocaleString(), label: "Total" },
  ]

  return <StatGrid items={items} />
}

export const portainerDefinition: ServiceDefinition<PortainerData> = {
  id: "portainer",
  name: "Portainer",
  icon: "portainer",
  category: "monitoring",
  defaultPollingMs: 15_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://portainer.example.org",
      helperText: "The base URL of your Portainer instance",
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: true,
      placeholder: "admin",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: true,
      placeholder: "Your Portainer password",
    },
    {
      key: "endpointId",
      label: "Environment ID",
      type: "text",
      required: false,
      placeholder: "1",
      helperText: "Portainer environment ID (default: 1)",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const endpointId = config.endpointId ?? 1

    // First, authenticate to get a JWT token
    const authRes = await fetch(`${baseUrl}/api/auth`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: config.username,
        password: config.password,
      }),
    })

    if (!authRes.ok) {
      if (authRes.status === 400)
        throw new Error("Invalid username or password")
      if (authRes.status === 404)
        throw new Error("Portainer not found at this URL")
      throw new Error(`Portainer auth error: ${authRes.status}`)
    }

    const authData = await authRes.json()
    const token = authData.jwt

    const headers = { Authorization: `Bearer ${token}` }

    // Fetch containers from configured endpoint (like Homepage)
    const containersRes = await fetch(
      `${baseUrl}/api/endpoints/${endpointId}/docker/containers/json?all=1`,
      { headers }
    )

    const containersData = containersRes.ok ? await containersRes.json() : []

    const running = containersData.filter(
      (c: { State: string }) => c.State === "running"
    ).length
    const stopped = containersData.filter(
      (c: { State: string }) => c.State === "exited"
    ).length

    return {
      _status: "ok" as const,
      running,
      stopped,
      total: containersData.length,
    }
  },

  Widget: PortainerWidget,
}
