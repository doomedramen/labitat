import type { ServiceDefinition } from "./types"
import { StatGrid } from "./widgets"

type UniFiData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  uptime: string
  wan: string
  lanUsers: number
  wlanUsers: number
}

function UniFiWidget({ uptime, wan, lanUsers, wlanUsers }: UniFiData) {
  const items = [
    { value: uptime, label: "Uptime" },
    { value: wan, label: "WAN" },
    { value: lanUsers, label: "LAN Users" },
    { value: wlanUsers, label: "WLAN Users" },
  ]

  return <StatGrid items={items} />
}

export const unifiDefinition: ServiceDefinition<UniFiData> = {
  id: "unifi",
  name: "UniFi",
  icon: "ubiquiti-unifi",
  category: "networking",
  defaultPollingMs: 30_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://unifi.example.org",
      helperText: "The URL of your UniFi Network Controller",
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
      placeholder: "Your UniFi password",
    },
    {
      key: "site",
      label: "Site",
      type: "text",
      required: false,
      placeholder: "default",
      helperText: "Site name (default: default)",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const site = config.site ?? "default"

    // UniFi requires login first to get a session cookie
    const loginRes = await fetch(`${baseUrl}/api/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: config.username,
        password: config.password,
      }),
    })

    if (!loginRes.ok) {
      if (loginRes.status === 401)
        throw new Error("Invalid username or password")
      if (loginRes.status === 404) throw new Error("UniFi controller not found")
      throw new Error(`UniFi login error: ${loginRes.status}`)
    }

    // Extract CSRF token from response headers
    const csrfToken = loginRes.headers.get("x-csrf-token")
    const cookies = loginRes.headers.get("set-cookie") ?? ""

    const headers: Record<string, string> = {
      Cookie: cookies,
      "Content-Type": "application/json",
    }
    if (csrfToken) {
      headers["X-CSRF-Token"] = csrfToken
    }

    // Get site stats (like Homepage - use /api/stat/sites)
    const statsRes = await fetch(
      `${baseUrl}/proxy/network/api/s/${site}/stat/sites`,
      { headers }
    )

    if (!statsRes.ok) {
      throw new Error("Failed to fetch site stats")
    }

    const statsData = await statsRes.json()
    const siteData = statsData.data?.find(
      (s: { desc: string; name: string }) => s.desc === site || s.name === site
    )

    if (!siteData) {
      throw new Error(`Site '${site}' not found`)
    }

    // Get health data for wan, lan, wlan (matching Homepage)
    const wan = siteData.health?.find(
      (h: { subsystem: string }) => h.subsystem === "wan"
    )
    const lan = siteData.health?.find(
      (h: { subsystem: string }) => h.subsystem === "lan"
    )
    const wlan = siteData.health?.find(
      (h: { subsystem: string }) => h.subsystem === "wlan"
    )

    // Calculate uptime from gw_system-stats
    const uptime = wan?.["gw_system-stats"]?.uptime
      ? `${Math.floor(wan["gw_system-stats"].uptime / 86400)}d`
      : null

    return {
      _status: "ok" as const,
      uptime: uptime ?? "0d",
      wan: wan?.status === "ok" ? "UP" : "DOWN",
      lanUsers: lan?.num_user ?? 0,
      wlanUsers: wlan?.num_user ?? 0,
    }
  },

  Widget: UniFiWidget,
}
