import type { ServiceDefinition } from "./types"
import type { StatItem } from "@/components/widgets"
import { formatDuration } from "@/lib/utils/format"
import {
  Users,
  UserPlus,
  Router,
  Globe,
  Wifi,
  EthernetPort,
  ArrowUpRight,
  ArrowDownRight,
  Clock,
} from "lucide-react"

type UnifiData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  users: number
  guests: number
  devices: number
  sites: number
  // Network health stats (from stat/sites endpoint)
  wanStatus?: "up" | "down" | null
  lanUsers?: number
  wlanUsers?: number
  gatewayUptime?: string // human readable (e.g., "15.3 days")
}
import { fetchWithTimeout } from "./fetch-with-timeout"

function unifiToPayload(data: UnifiData) {
  const stats: StatItem[] = [
    {
      id: "users",
      value: data.users,
      label: "Users",
      icon: Users,
    },
    {
      id: "guests",
      value: data.guests,
      label: "Guests",
      icon: UserPlus,
    },
    {
      id: "devices",
      value: data.devices,
      label: "Devices",
      icon: Router,
    },
    {
      id: "sites",
      value: data.sites,
      label: "Sites",
      icon: Globe,
    },
  ]

  // Add network health stats if available
  if (data.gatewayUptime) {
    stats.push({
      id: "uptime",
      value: data.gatewayUptime,
      label: "Uptime",
      icon: Clock,
    })
  }

  if (data.wanStatus !== undefined && data.wanStatus !== null) {
    stats.push({
      id: "wan",
      value: data.wanStatus === "up" ? "Up" : "Down",
      label: "WAN",
      icon: data.wanStatus === "up" ? ArrowUpRight : ArrowDownRight,
    })
  }

  if (data.lanUsers !== undefined) {
    stats.push({
      id: "lan",
      value: data.lanUsers,
      label: "LAN",
      icon: EthernetPort,
    })
  }

  if (data.wlanUsers !== undefined) {
    stats.push({
      id: "wlan",
      value: data.wlanUsers,
      label: "WLAN",
      icon: Wifi,
    })
  }

  return {
    stats,
    // Default to 4 stats: hide Users, Guests, Sites, Uptime
    defaultActiveIds: ["devices", "wan", "lan", "wlan"],
  }
}

export const unifiDefinition: ServiceDefinition<UnifiData> = {
  id: "unifi",
  name: "UniFi",
  icon: "unifi",
  category: "monitoring",
  defaultPollingMs: 15_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://unifi.example.org",
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
      label: "Site Name",
      type: "text",
      required: false,
      placeholder: "default",
      helperText: "UniFi site name (default: default)",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const siteName = config.site ?? "default"

    // Login
    const loginRes = await fetchWithTimeout(`${baseUrl}/api/login`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        username: config.username,
        password: config.password,
      }),
    })

    if (!loginRes.ok) throw new Error(`UniFi login failed: ${loginRes.status}`)

    const cookie = loginRes.headers.getSetCookie?.().join("; ") ?? ""
    const headers = { Cookie: cookie }

    // Get site health data (matches Homepage's approach)
    const sitesRes = await fetchWithTimeout(
      `${baseUrl}/api/s/default/stat/sites`,
      {
        headers,
      }
    )

    if (!sitesRes.ok) throw new Error(`UniFi error: ${sitesRes.status}`)

    const sitesData = await sitesRes.json()
    const site = sitesData.data?.find(
      (s: { name: string }) => s.name === siteName
    )

    // Extract network health from site data
    let wanStatus: "up" | "down" | null = null
    let lanUsers: number | undefined
    let wlanUsers: number | undefined
    let gatewayUptime: string | undefined

    if (site?.health) {
      const wan = site.health.find(
        (h: { subsystem: string }) => h.subsystem === "wan"
      )
      const lan = site.health.find(
        (h: { subsystem: string }) => h.subsystem === "lan"
      )
      const wlan = site.health.find(
        (h: { subsystem: string }) => h.subsystem === "wlan"
      )

      if (wan && wan.status !== "unknown") {
        wanStatus = wan.status === "ok" ? "up" : "down"
      }

      if (lan && lan.status !== "unknown") {
        lanUsers = lan.num_user ?? 0
      }

      if (wlan && wlan.status !== "unknown") {
        wlanUsers = wlan.num_user ?? 0
      }

      // Gateway uptime
      if (wan?.["gw_system-stats"]?.uptime) {
        gatewayUptime = formatDuration(wan["gw_system-stats"].uptime)
      }
    }

    // Also get client counts for backwards compatibility
    const [clientsRes, devicesRes] = await Promise.all([
      fetchWithTimeout(`${baseUrl}/api/s/default/stat/sta/all`, { headers }),
      fetchWithTimeout(`${baseUrl}/api/s/default/rest/device`, { headers }),
    ])

    const clients = clientsRes.ok ? await clientsRes.json() : { data: [] }
    const devices = devicesRes.ok ? await devicesRes.json() : { data: [] }

    const users =
      clients.data?.filter((c: { is_guest: boolean }) => !c.is_guest).length ??
      0
    const guests =
      clients.data?.filter((c: { is_guest: boolean }) => c.is_guest).length ?? 0

    return {
      _status: "ok",
      users,
      guests,
      devices: devices.data?.length ?? 0,
      sites: sitesData.data?.length ?? 1,
      wanStatus,
      lanUsers,
      wlanUsers,
      gatewayUptime,
    }
  },
  toPayload: unifiToPayload,
}
