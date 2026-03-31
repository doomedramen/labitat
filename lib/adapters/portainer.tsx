import type { ServiceDefinition } from "./types"

type PortainerData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  runningContainers: number
  stoppedContainers: number
  totalContainers: number
  stacks: number
}

function PortainerWidget({
  runningContainers,
  stoppedContainers,
  totalContainers,
  stacks,
}: PortainerData) {
  const items = [
    { value: runningContainers, label: "Running" },
    { value: stoppedContainers, label: "Stopped" },
    { value: totalContainers, label: "Total" },
    { value: stacks, label: "Stacks" },
  ]

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-1.5 text-xs">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1 text-center"
        >
          <span className="font-medium text-foreground tabular-nums">
            {item.value}
          </span>
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  )
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
      placeholder: "https://portainer.home.lab",
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
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")

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

    // Fetch containers and stacks from the default endpoint (ID: 1)
    const [containersRes, stacksRes] = await Promise.all([
      fetch(`${baseUrl}/api/endpoints/1/docker/containers/json?all=true`, {
        headers,
      }),
      fetch(`${baseUrl}/api/endpoints/1/stacks`, { headers }),
    ])

    const containersData = containersRes.ok ? await containersRes.json() : []
    const stacksData = stacksRes.ok ? await stacksRes.json() : []

    const runningContainers = containersData.filter(
      (c: { State: string }) => c.State === "running"
    ).length
    const stoppedContainers = containersData.filter(
      (c: { State: string }) => c.State === "exited"
    ).length

    return {
      _status: "ok" as const,
      runningContainers,
      stoppedContainers,
      totalContainers: containersData.length,
      stacks: stacksData.length,
    }
  },

  Widget: PortainerWidget,
}
