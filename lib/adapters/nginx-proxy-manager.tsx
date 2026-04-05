import type { ServiceDefinition } from "./types"
import { StatGrid } from "./widgets"

type NginxProxyManagerData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  enabled: number
  disabled: number
  total: number
}

function NginxProxyManagerWidget({
  enabled,
  disabled,
  total,
}: NginxProxyManagerData) {
  const items = [
    { value: enabled.toLocaleString(), label: "Enabled" },
    { value: disabled.toLocaleString(), label: "Disabled" },
    { value: total.toLocaleString(), label: "Total" },
  ]

  return <StatGrid items={items} />
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
        placeholder: "http://10.0.0.2:81",
        helperText: "The base URL of your Nginx Proxy Manager instance",
      },
      {
        key: "email",
        label: "Email",
        type: "text",
        required: true,
        placeholder: "admin@example.com",
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

      // Authenticate to get access token
      const authRes = await fetch(`${baseUrl}/api/tokens`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          identity: config.email,
          secret: config.password,
        }),
      })

      if (!authRes.ok) {
        if (authRes.status === 400 || authRes.status === 401) {
          throw new Error("Invalid email or password")
        }
        if (authRes.status === 404)
          throw new Error("Nginx Proxy Manager not found at this URL")
        throw new Error(`NPM auth error: ${authRes.status}`)
      }

      const authData = await authRes.json()
      const token = authData.token

      const headers = {
        Authorization: `Bearer ${token}`,
        "Content-Type": "application/json",
      }

      // Fetch proxy hosts only (like Homepage)
      const proxyRes = await fetch(`${baseUrl}/api/nginx/proxy-hosts`, {
        headers,
      })

      if (!proxyRes.ok) {
        throw new Error(`NPM error: ${proxyRes.status}`)
      }

      const proxyData = await proxyRes.json()

      // Count enabled and disabled hosts
      const enabled = Array.isArray(proxyData)
        ? proxyData.filter((h: { enabled: boolean }) => h.enabled).length
        : 0
      const disabled = Array.isArray(proxyData)
        ? proxyData.filter((h: { enabled: boolean }) => !h.enabled).length
        : 0

      return {
        _status: "ok" as const,
        enabled,
        disabled,
        total: Array.isArray(proxyData) ? proxyData.length : 0,
      }
    },

    Widget: NginxProxyManagerWidget,
  }
