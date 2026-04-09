import type { ServiceDefinition } from "./types"
import { DownloadList, type DownloadItem } from "@/components/widgets"
import { WidgetStatGrid } from "@/components/dashboard/item/widget-stat-grid"
import { Film, Download, AlertTriangle, Search } from "lucide-react"

type RadarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  queued: number
  missing: number
  wanted: number
  movies: number
  showActiveDownloads?: boolean
  downloads?: DownloadItem[]
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function formatTimeLeft(minutes: number): string {
  if (minutes <= 0) return ""
  if (minutes < 60) return `${Math.round(minutes)}m`
  const hours = Math.floor(minutes / 60)
  const mins = Math.round(minutes % 60)
  return `${hours}h ${mins}m`
}

function RadarrWidget({
  queued,
  missing,
  wanted,
  movies,
  showActiveDownloads,
  downloads,
}: RadarrData) {
  return (
    <div className="space-y-2">
      <WidgetStatGrid
        items={[
          {
            id: "queued",
            value: queued,
            label: "Queued",
            icon: <Download className="h-3 w-3" />,
          },
          {
            id: "missing",
            value: missing,
            label: "Missing",
            icon: <AlertTriangle className="h-3 w-3" />,
          },
          {
            id: "wanted",
            value: wanted,
            label: "Wanted",
            icon: <Search className="h-3 w-3" />,
          },
          {
            id: "movies",
            value: movies,
            label: "Movies",
            icon: <Film className="h-3 w-3" />,
          },
        ]}
      />
      {showActiveDownloads && downloads && downloads.length > 0 && (
        <DownloadList downloads={downloads} />
      )}
    </div>
  )
}

export const radarrDefinition: ServiceDefinition<RadarrData> = {
  id: "radarr",
  name: "Radarr",
  icon: "radarr",
  category: "downloads",
  defaultPollingMs: 10_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://radarr.example.org",
      helperText: "The base URL of your Radarr instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Radarr API key",
      helperText: "Found in Radarr → Settings → General → API Key",
    },
    {
      key: "showActiveDownloads",
      label: "Show active downloads",
      type: "boolean",
      helperText: "Display currently downloading items",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = { "X-Api-Key": config.apiKey }
    const showActiveDownloads = config.showActiveDownloads === "true"

    const [queueRes, movieRes, missingRes, cutoffRes] = await Promise.all([
      fetch(`${baseUrl}/api/v3/queue?pageSize=50&includeMovie=true`, {
        headers,
      }),
      fetch(`${baseUrl}/api/v3/movie`, { headers }),
      fetch(`${baseUrl}/api/v3/wanted/missing?pageSize=1`, { headers }),
      fetch(`${baseUrl}/api/v3/wanted/cutoff?pageSize=1`, { headers }),
    ])

    if (!queueRes.ok) throw new Error(`Radarr error: ${queueRes.status}`)
    if (!movieRes.ok) throw new Error(`Radarr error: ${movieRes.status}`)
    if (!missingRes.ok) throw new Error(`Radarr error: ${missingRes.status}`)

    const queue = await queueRes.json()
    const movies = await movieRes.json()
    const missing = await missingRes.json()
    const cutoff = cutoffRes.ok ? await cutoffRes.json() : { totalRecords: 0 }

    const downloads: DownloadItem[] = []
    if (showActiveDownloads && queue.records) {
      for (const record of queue.records) {
        const size = record.size ?? 0
        const sizeleft = record.sizeleft ?? size
        const downloaded = size - sizeleft
        const progress = size > 0 ? (downloaded / size) * 100 : 0

        // Calculate time left from estimatedCompletionTime
        let timeLeft: string | undefined
        if (record.estimatedCompletionTime) {
          const eta = new Date(record.estimatedCompletionTime).getTime()
          const now = Date.now()
          const minutesLeft = (eta - now) / 1000 / 60
          if (minutesLeft > 0) {
            timeLeft = formatTimeLeft(minutesLeft)
          }
        }

        // Determine activity state from trackedDownloadState
        const state = record.trackedDownloadState?.toLowerCase() ?? ""
        let activity: string | undefined
        if (state.includes("import")) {
          activity = "Importing"
        } else if (state.includes("download")) {
          activity = "Downloading"
        } else if (state.includes("fail")) {
          activity = "Failed"
        } else if (record.status === "paused") {
          activity = "Paused"
        } else if (record.status === "queued") {
          activity = "Queued"
        }

        downloads.push({
          title: record.title ?? "Unknown",
          progress,
          timeLeft,
          activity,
          size: size > 0 ? formatBytes(size) : undefined,
        })
      }
    }

    return {
      _status: "ok",
      queued: queue.totalRecords ?? 0,
      missing: missing.totalRecords ?? 0,
      wanted: cutoff.totalRecords ?? 0,
      movies: Array.isArray(movies) ? movies.length : 0,
      showActiveDownloads,
      downloads,
    }
  },
  Widget: RadarrWidget,
}
