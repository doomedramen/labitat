import type { ServiceDefinition } from "./types"

type QBittorrentData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  leech: number
  download: number
  seed: number
  upload: number
}

function QBittorrentWidget({
  leech,
  download,
  seed,
  upload,
}: QBittorrentData) {
  const items = [
    { value: leech, label: "Leech" },
    { value: download, label: "Download" },
    { value: seed, label: "Seed" },
    { value: upload, label: "Upload" },
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

export const qbittorrentDefinition: ServiceDefinition<QBittorrentData> = {
  id: "qbittorrent",
  name: "qBittorrent",
  icon: "qbittorrent",
  category: "downloads",
  defaultPollingMs: 5_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://qbittorrent.home.lab",
      helperText: "The base URL of your qBittorrent WebUI",
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
      placeholder: "Your qBittorrent password",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")

    // First, login to get a session cookie
    const loginRes = await fetch(`${baseUrl}/api/v2/auth/login`, {
      method: "POST",
      headers: { "Content-Type": "application/x-www-form-urlencoded" },
      body: `username=${encodeURIComponent(config.username)}&password=${encodeURIComponent(config.password)}`,
    })

    if (!loginRes.ok) {
      if (loginRes.status === 401 || loginRes.status === 403) {
        throw new Error("Invalid username or password")
      }
      throw new Error(`qBittorrent login error: ${loginRes.status}`)
    }

    // Extract SID cookie from response
    const cookie = loginRes.headers.get("set-cookie")
    if (!cookie) {
      throw new Error("No session cookie returned")
    }

    // Get torrent list (like Homepage)
    const headers = { Cookie: cookie }
    const torrentsRes = await fetch(`${baseUrl}/api/v2/torrents/info`, { headers })

    if (!torrentsRes.ok) {
      throw new Error("Failed to fetch torrent data")
    }

    const torrentsData = await torrentsRes.json()

    // Calculate stats (matching Homepage logic)
    let rateDl = 0
    let rateUl = 0
    let completed = 0

    for (const torrent of torrentsData) {
      rateDl += torrent.dlspeed ?? 0
      rateUl += torrent.upspeed ?? 0
      if (torrent.progress === 1) {
        completed++
      }
    }

    const leech = torrentsData.length - completed

    return {
      _status: "ok" as const,
      leech,
      download: rateDl,
      seed: completed,
      upload: rateUl,
    }
  },

  Widget: QBittorrentWidget,
}
