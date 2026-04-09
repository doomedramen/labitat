import type { ServiceDefinition } from "./types"
import { Route, Server, Shield } from "lucide-react"

type TraefikData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  routers: number
  services: number
  middlewares: number
}

function traefikToPayload(data: TraefikData) {
  return {
    stats: [
      {
        id: "routers",
        value: (data.routers ?? 0).toLocaleString(),
        label: "Routers",
        icon: Route,
      },
      {
        id: "services",
        value: (data.services ?? 0).toLocaleString(),
        label: "Services",
        icon: Server,
      },
      {
        id: "middlewares",
        value: (data.middlewares ?? 0).toLocaleString(),
        label: "Middlewares",
        icon: Shield,
      },
    ],
  }
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
      placeholder: "https://traefik.example.org",
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
      placeholder: "Your Traefik password or API key",
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

    // Fetch Traefik overview endpoint
    const overviewRes = await fetch(`${baseUrl}/api/overview`, { headers })

    if (!overviewRes.ok) {
      if (overviewRes.status === 401) throw new Error("Invalid credentials")
      if (overviewRes.status === 404)
        throw new Error("Traefik not found at this URL")
      throw new Error(`Traefik error: ${overviewRes.status}`)
    }

    const overviewData = await overviewRes.json()

    return {
      _status: "ok" as const,
      routers: overviewData.http?.routers?.total ?? 0,
      services: overviewData.http?.services?.total ?? 0,
      middlewares: overviewData.http?.middlewares?.total ?? 0,
    }
  },

  toPayload: traefikToPayload,
}
