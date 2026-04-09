import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

type NginxProxyManagerData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  hosts: number
  redirHosts: number
  streams: number
  deadHosts: number
}

function NginxProxyManagerWidget({
  hosts,
  redirHosts,
  streams,
  deadHosts,
}: NginxProxyManagerData) {
  return (
    <StatGrid
      items={[
        { value: hosts, label: "Proxy Hosts" },
        { value: redirHosts, label: "Redirections" },
        { value: streams, label: "Streams" },
        { value: deadHosts, label: "Disabled" },
      ]}
    />
  )
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
      const headers = { Authorization: `Bearer ${tokenData.token}` }

      // Get counts
      const [hostsRes, redirRes, streamsRes, deadRes] = await Promise.all([
        fetch(`${baseUrl}/api/nginx/proxy-hosts?expand=owner`, { headers }),
        fetch(`${baseUrl}/api/nginx/redirection-hosts?expand=owner`, {
          headers,
        }),
        fetch(`${baseUrl}/api/nginx/streams?expand=owner`, { headers }),
        fetch(`${baseUrl}/api/nginx/dead-hosts?expand=owner`, { headers }),
      ])

      const hosts = hostsRes.ok ? (await hostsRes.json()).length : 0
      const redirHosts = redirRes.ok ? (await redirRes.json()).length : 0
      const streams = streamsRes.ok ? (await streamsRes.json()).length : 0
      const deadHosts = deadRes.ok ? (await deadRes.json()).length : 0

      return {
        _status: "ok",
        hosts,
        redirHosts,
        streams,
        deadHosts,
      }
    },
    Widget: NginxProxyManagerWidget,
  }
