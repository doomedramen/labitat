import type { ServiceDefinition } from "./types"
import { Users, UserPlus, Router, Globe } from "lucide-react"

type UnifiData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  users: number
  guests: number
  devices: number
  sites: number
}

function unifiToPayload(data: UnifiData) {
  return {
    stats: [
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
    ],
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
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")

    // Login
    const loginRes = await fetch(`${baseUrl}/api/login`, {
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

    // Get client counts
    const [clientsRes, devicesRes] = await Promise.all([
      fetch(`${baseUrl}/api/s/default/stat/sta/all`, { headers }),
      fetch(`${baseUrl}/api/s/default/rest/device`, { headers }),
    ])

    if (!clientsRes.ok) throw new Error(`UniFi error: ${clientsRes.status}`)

    const clients = await clientsRes.json()
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
      sites: 1,
    }
  },
  toPayload: unifiToPayload,
}
