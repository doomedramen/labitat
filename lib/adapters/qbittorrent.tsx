import type { ServiceDefinition } from "./types"

type QBittorrentData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  downloading: number
  seeding: number
  paused: number
  speed: string
}

function formatSpeed(bytesPerSec: number): string {
  if (bytesPerSec >= 1_000_000) {
    return `${(bytesPerSec / 1_000_000).toFixed(1)} MB/s`
  }
  return `${(bytesPerSec / 1_000).toFixed(0)} KB/s`
}

function QBittorrentWidget({
  downloading,
  seeding,
  paused,
  speed,
}: QBittorrentData) {
  const items = [
    { value: downloading, label: "Downloading" },
    { value: seeding, label: "Seeding" },
    { value: paused, label: "Paused" },
    { value: speed, label: "Down" },
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

    // Get transfer info and torrent list
    const headers = { Cookie: cookie }

    const [transferRes, torrentsRes] = await Promise.all([
      fetch(`${baseUrl}/api/v2/transfer/info`, { headers }),
      fetch(`${baseUrl}/api/v2/torrents/info`, { headers }),
    ])

    if (!transferRes.ok || !torrentsRes.ok) {
      throw new Error("Failed to fetch torrent data")
    }

    const transferData = await transferRes.json()
    const torrentsData = await torrentsRes.json()

    // Count by state
    let downloading = 0
    let seeding = 0
    let paused = 0

    for (const torrent of torrentsData) {
      if (torrent.state === "downloading" || torrent.state === "stalledDL") {
        downloading++
      } else if (
        torrent.state === "uploading" ||
        torrent.state === "stalledUP" ||
        torrent.state === "forcedUP"
      ) {
        seeding++
      } else if (torrent.state === "pausedDL" || torrent.state === "pausedUP") {
        paused++
      }
    }

    return {
      _status: "ok" as const,
      downloading,
      seeding,
      paused,
      speed: formatSpeed(transferData.dl_info_speed ?? 0),
    }
  },

  Widget: QBittorrentWidget,
}
