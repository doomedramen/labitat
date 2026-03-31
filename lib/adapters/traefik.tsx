import type { ServiceDefinition } from "./types"

type TraefikData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  routers: number
  services: number
  middlewares: number
  containers: number
}

function TraefikWidget({
  routers,
  services,
  middlewares,
  containers,
}: TraefikData) {
  const items = [
    { value: routers, label: "Routers" },
    { value: services, label: "Services" },
    { value: middlewares, label: "Middlewares" },
    { value: containers, label: "Containers" },
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

export const traefikDefinition: ServiceDefinition<TraefikData> = {
  id: "traefik",
  name: "Traefik",
  icon: "traefik",
  category: "networking",
  defaultPollingMs: 15_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://traefik.home.lab",
      helperText: "The base URL of your Traefik dashboard",
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: false,
      placeholder: "admin",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: false,
      placeholder: "Your Traefik dashboard password",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")

    const headers: Record<string, string> = {}

    // Add basic auth if credentials provided
    if (config.username && config.password) {
      const auth = Buffer.from(
        `${config.username}:${config.password}`
      ).toString("base64")
      headers.Authorization = `Basic ${auth}`
    }

    // Fetch Traefik API endpoints
    const [routersRes, servicesRes, middlewaresRes] = await Promise.all([
      fetch(`${baseUrl}/api/http/routers`, { headers }),
      fetch(`${baseUrl}/api/http/services`, { headers }),
      fetch(`${baseUrl}/api/http/middlewares`, { headers }),
    ])

    if (!routersRes.ok) {
      if (routersRes.status === 401) throw new Error("Invalid credentials")
      if (routersRes.status === 404)
        throw new Error("Traefik not found at this URL")
      throw new Error(`Traefik error: ${routersRes.status}`)
    }

    const routersData = await routersRes.json()
    const servicesData = (await servicesRes.ok) ? await servicesRes.json() : []
    const middlewaresData = (await middlewaresRes.ok)
      ? await middlewaresRes.json()
      : []

    // Count containers from router providers
    const containerSet = new Set()
    for (const router of routersData) {
      if (router.service) {
        const service = servicesData.find(
          (s: { name: string }) => s.name === router.service
        )
        if (service?.serverStatus) {
          Object.keys(service.serverStatus).forEach((server) => {
            // Extract container name from server URL
            const match = server.match(/([^:/]+):\d+$/)
            if (match) containerSet.add(match[1])
          })
        }
      }
    }

    return {
      _status: "ok" as const,
      routers: routersData.length,
      services: servicesData.length,
      middlewares: middlewaresData.length,
      containers: containerSet.size,
    }
  },

  Widget: TraefikWidget,
}
