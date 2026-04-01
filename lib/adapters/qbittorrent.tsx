import type { ServiceDefinition } from "./types"
import { DownloadList, StatGrid, type DownloadItem } from "./widgets"

type QBittorrentData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  leech: number
  download: number
  seed: number
  upload: number
  showDownloads?: boolean
  downloads?: DownloadItem[]
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) {
    return `${(bytes / 1_000_000_000).toFixed(1)} GB`
  }
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`
  }
  if (bytes >= 1_000) {
    return `${(bytes / 1_000).toFixed(1)} KB`
  }
  return `${bytes.toFixed(0)} B`
}

function formatTime(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) return "∞"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  return `${m}:${s.toString().padStart(2, "0")}`
}

function QBittorrentWidget({
  leech,
  download,
  seed,
  upload,
  showDownloads,
  downloads,
}: QBittorrentData) {
  const items = [
    { value: leech, label: "Leech" },
    { value: `${formatBytes(download)}/s`, label: "Download" },
    { value: seed, label: "Seed" },
    { value: `${formatBytes(upload)}/s`, label: "Upload" },
  ]

  return (
    <div>
      <StatGrid items={items} />

      {showDownloads && downloads && downloads.length > 0 && (
        <DownloadList downloads={downloads} />
      )}
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
    {
      key: "showDownloads",
      label: "Show active downloads",
      type: "boolean",
      helperText: "Display currently downloading torrents with progress",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const showDownloads = config.showDownloads === "true"

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
    const torrentsRes = await fetch(`${baseUrl}/api/v2/torrents/info`, {
      headers,
    })

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

    // Build download list for active downloads
    let downloads: DownloadItem[] = []
    if (showDownloads) {
      const statePriority = [
        "downloading",
        "forcedDL",
        "metaDL",
        "forcedMetaDL",
        "checkingDL",
        "stalledDL",
        "queuedDL",
        "pausedDL",
      ]

      const leechTorrents = torrentsData.filter(
        (t: { state: string; progress: number }) =>
          t.state.includes("DL") && t.progress < 1
      )

      leechTorrents.sort(
        (
          a: { state: string; progress: number },
          b: { state: string; progress: number }
        ) => {
          const firstStateIndex = statePriority.indexOf(a.state)
          const secondStateIndex = statePriority.indexOf(b.state)
          if (firstStateIndex !== secondStateIndex) {
            return firstStateIndex - secondStateIndex
          }
          return b.progress - a.progress
        }
      )

      downloads = leechTorrents.map((t: Record<string, unknown>) => ({
        title: (t.name as string) ?? "Unknown",
        progress: ((t.progress as number) ?? 0) * 100,
        timeLeft: formatTime((t.eta as number) ?? -1),
        activity: t.state as string,
        size: formatBytes((t.size as number) ?? 0),
      }))
    }

    return {
      _status: "ok" as const,
      leech,
      download: rateDl,
      seed: completed,
      upload: rateUl,
      showDownloads,
      downloads,
    }
  },

  Widget: QBittorrentWidget,
}
