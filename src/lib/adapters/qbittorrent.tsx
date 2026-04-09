import type { ServiceDefinition } from "./types"
import type { DownloadItem } from "@/components/widgets"
import { ArrowDown, ArrowUp, Download, List } from "lucide-react"

type QBittorrentData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  downSpeed: string
  upSpeed: string
  activeDownloads: number
  queued: number
  downloads?: DownloadItem[]
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`
}

function formatTime(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) return "∞"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, "0")}h`
  return `${m} min`
}

function qbittorrentToPayload(data: QBittorrentData) {
  return {
    stats: [
      {
        id: "down",
        value: data.downSpeed,
        label: "Down",
        icon: <ArrowDown className="h-3 w-3" />,
      },
      {
        id: "up",
        value: data.upSpeed,
        label: "Up",
        icon: <ArrowUp className="h-3 w-3" />,
      },
      {
        id: "active",
        value: data.activeDownloads,
        label: "Active",
        icon: <Download className="h-3 w-3" />,
      },
      {
        id: "queued",
        value: data.queued,
        label: "Queued",
        icon: <List className="h-3 w-3" />,
      },
    ],
    downloads: data.downloads?.length ? data.downloads : undefined,
  }
}

export const qbittorrentDefinition: ServiceDefinition<QBittorrentData> = {
  id: "qbittorrent",
  name: "qBittorrent",
  icon: "qbittorrent",
  category: "downloads",
  defaultPollingMs: 10_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://qbittorrent.example.org",
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

    // Login
    const loginRes = await fetch(`${baseUrl}/api/v2/auth/login`, {
      method: "POST",
      body: new URLSearchParams({
        username: config.username,
        password: config.password,
      }),
    })
    if (!loginRes.ok)
      throw new Error(`qBittorrent login failed: ${loginRes.status}`)
    // qBittorrent returns HTTP 200 with body "Fails." on bad credentials
    const loginBody = await loginRes.text()
    if (loginBody.trim() === "Fails.")
      throw new Error("qBittorrent login failed: invalid credentials")
    const cookie = loginRes.headers.getSetCookie?.()[0] ?? ""

    const headers = { Cookie: cookie }

    // Get transfer info, torrent list, and queued count
    const [infoRes, torrentsRes, queuedRes] = await Promise.all([
      fetch(`${baseUrl}/api/v2/transfer/info`, { headers }),
      fetch(`${baseUrl}/api/v2/torrents/info?filter=downloading`, { headers }),
      fetch(`${baseUrl}/api/v2/torrents/info?filter=queuedDL`, { headers }),
    ])

    if (!infoRes.ok) throw new Error(`qBittorrent error: ${infoRes.status}`)

    const info = await infoRes.json()
    const torrents = torrentsRes.ok ? await torrentsRes.json() : []
    const queued = queuedRes.ok ? (await queuedRes.json()).length : 0

    // Build active download list (top 3 by speed)
    const downloads: DownloadItem[] = torrents
      .sort(
        (a: { dlspeed: number }, b: { dlspeed: number }) =>
          b.dlspeed - a.dlspeed
      )
      .slice(0, 3)
      .map(
        (t: {
          name: string
          progress: number
          eta: number
          dlspeed: number
          size: number
        }) => ({
          title: t.name,
          progress: Math.round(t.progress * 100),
          timeLeft: formatTime(t.eta),
          activity: "downloading",
          size: formatBytes(t.size),
        })
      )

    return {
      _status: "ok",
      downSpeed: formatSpeed(info.dl_info_speed ?? 0),
      upSpeed: formatSpeed(info.up_info_speed ?? 0),
      activeDownloads: torrents.length,
      queued,
      downloads,
    }
  },
  toPayload: qbittorrentToPayload,
}
