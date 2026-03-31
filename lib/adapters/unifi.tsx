import type { ServiceDefinition } from "./types"

type UniFiData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  uptime: string
  wan: string
  lanUsers: number
  wlanUsers: number
}

function formatUptime(seconds: number): string {
  const days = Math.floor(seconds / 86400)
  if (days > 0) return `${days}d`
  const hours = Math.floor(seconds / 3600)
  if (hours > 0) return `${hours}h`
  return `${Math.floor(seconds / 60)}m`
}

function UniFiWidget({ uptime, wan, lanUsers, wlanUsers }: UniFiData) {
  const items = [
    { value: uptime, label: "Uptime" },
    { value: wan, label: "WAN" },
    { value: lanUsers, label: "LAN Users" },
    { value: wlanUsers, label: "WLAN Users" },
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
      placeholder: "https://ui.home.lab",
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
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")

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

    // Get site data - default site is "default"
    const [siteRes, statRes] = await Promise.all([
      fetch(`${baseUrl}/proxy/network/api/s/default/self`, { headers }),
      fetch(`${baseUrl}/proxy/network/api/s/default/stat/sta`, { headers }),
    ])

    if (!siteRes.ok) {
      throw new Error("Failed to fetch site data")
    }

    const siteData = await siteRes.json()
    const statData = statRes.ok ? await statRes.json() : { data: [] }

    const systemInfo = siteData.data?.[0] ?? {}
    const clients = statData.data ?? []

    // Count wired vs wireless clients
    let lanUsers = 0
    let wlanUsers = 0
    for (const client of clients) {
      if (client.is_wired) lanUsers++
      else wlanUsers++
    }

    // Get uptime from system stats
    const uptimeSeconds = systemInfo.uptime ?? 0

    // WAN status - check if uplink is available
    const wanStatus = systemInfo.wan_up ? "UP" : "DOWN"

    return {
      _status: wanStatus === "UP" ? "ok" : "error",
      uptime: formatUptime(uptimeSeconds),
      wan: wanStatus,
      lanUsers,
      wlanUsers,
    }
  },

  Widget: UniFiWidget,
}
