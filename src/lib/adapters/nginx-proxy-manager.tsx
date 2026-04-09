import type { ServiceDefinition } from "./types"
import { Globe, ArrowRight, Wifi, Ban } from "lucide-react"

type NginxProxyManagerData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  hosts: number
  redirHosts: number
  streams: number
  deadHosts: number
}

function nginxProxyManagerToPayload(data: NginxProxyManagerData) {
  return {
    stats: [
      {
        id: "hosts",
        value: data.hosts,
        label: "Proxy Hosts",
        icon: Globe,
        tooltip: "Proxy Hosts",
      },
      {
        id: "redirections",
        value: data.redirHosts,
        label: "Redirections",
        icon: ArrowRight,
        tooltip: "Redirections",
      },
      {
        id: "streams",
        value: data.streams,
        label: "Streams",
        icon: Wifi,
        tooltip: "Streams",
      },
      {
        id: "disabled",
        value: data.deadHosts,
        label: "Disabled",
        icon: Ban,
        tooltip: "Disabled",
      },
    ],
  }
}

function parseCount(data: unknown): number {
  if (Array.isArray(data)) return data.length
  if (data && typeof data === "object") {
    const obj = data as Record<string, unknown>
    if (Array.isArray(obj.data)) return (obj.data as unknown[]).length
    if (typeof obj.total === "number") return obj.total
  }
  return 0
}

export const nginxProxyManagerDefinition: ServiceDefinition<NginxProxyManagerData> =
  {
    id: "nginx-proxy-manager",
    name: "Nginx Proxy Manager",
    icon: "nginx-proxy-manager",
    category: "networking",
    defaultPollingMs: 15_000,
    configFields: [
      {
        key: "url",
        label: "URL",
        type: "url",
        required: true,
        placeholder: "https://npm.example.org",
      },
      {
        key: "email",
        label: "Email",
        type: "text",
        required: true,
        placeholder: "admin@example.org",
      },
      {
        key: "password",
        label: "Password",
        type: "password",
        required: true,
        placeholder: "Your NPM password",
      },
    ],
    async fetchData(config) {
      const baseUrl = config.url.replace(/\/$/, "")

      // Login
      const loginRes = await fetch(`${baseUrl}/api/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: config.email,
          secret: config.password,
        }),
      })

      if (!loginRes.ok) throw new Error(`NPM login failed: ${loginRes.status}`)

      const tokenData = await loginRes.json()
      const token = tokenData.token
      if (!token) throw new Error("NPM login failed: no token in response")

      const headers = { Authorization: `Bearer ${token}` }

      // Get counts
      const [hostsRes, redirRes, streamsRes, deadRes] = await Promise.all([
        fetch(`${baseUrl}/api/nginx/proxy-hosts`, { headers }),
        fetch(`${baseUrl}/api/nginx/redirection-hosts`, { headers }),
        fetch(`${baseUrl}/api/nginx/streams`, { headers }),
        fetch(`${baseUrl}/api/nginx/dead-hosts`, { headers }),
      ])

      const hosts = hostsRes.ok ? parseCount(await hostsRes.json()) : 0
      const redirHosts = redirRes.ok ? parseCount(await redirRes.json()) : 0
      const streams = streamsRes.ok ? parseCount(await streamsRes.json()) : 0
      const deadHosts = deadRes.ok ? parseCount(await deadRes.json()) : 0

      return {
        _status: "ok",
        hosts,
        redirHosts,
        streams,
        deadHosts,
      }
    },
    toPayload: nginxProxyManagerToPayload,
  }
