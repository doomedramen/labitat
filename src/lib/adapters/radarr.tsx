import type { ServiceDefinition } from "./types"
import type { DownloadItem } from "@/components/widgets"
import { formatBytes, formatTimeLeft } from "@/lib/utils/format"
import { validateResponse, validateArrayResponse } from "./validate"
import { Film, Download, AlertTriangle, Search } from "lucide-react"

type RadarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  queued: number
  missing: number
  wanted: number
  movies: number
  showActiveDownloads?: boolean
  enableQueue?: boolean
  downloads?: DownloadItem[]
}
import { fetchWithTimeout } from "./fetch-with-timeout"

function radarrToPayload(data: RadarrData) {
  return {
    stats: [
      {
        id: "queued",
        value: data.queued,
        label: "Queued",
        icon: Download,
      },
      {
        id: "missing",
        value: data.missing,
        label: "Missing",
        icon: AlertTriangle,
      },
      {
        id: "wanted",
        value: data.wanted,
        label: "Wanted",
        icon: Search,
      },
      {
        id: "movies",
        value: data.movies,
        label: "Movies",
        icon: Film,
      },
    ],
    downloads:
      data.enableQueue && data.showActiveDownloads && data.downloads?.length
        ? data.downloads
        : undefined,
  }
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
    {
      key: "enableQueue",
      label: "Show download queue",
      type: "boolean",
      required: false,
      helperText: "Enable or disable the download queue display",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = { "X-Api-Key": config.apiKey }
    const showActiveDownloads = config.showActiveDownloads === "true"
    const enableQueue = config.enableQueue !== "false" // Default to true

    const [queueRes, movieRes, missingRes, cutoffRes] = await Promise.all([
      fetchWithTimeout(
        `${baseUrl}/api/v3/queue?pageSize=50&includeMovie=true`,
        {
          headers,
        }
      ),
      fetchWithTimeout(`${baseUrl}/api/v3/movie`, { headers }),
      fetchWithTimeout(`${baseUrl}/api/v3/wanted/missing?pageSize=1`, {
        headers,
      }),
      fetchWithTimeout(`${baseUrl}/api/v3/wanted/cutoff?pageSize=1`, {
        headers,
      }),
    ])

    if (!queueRes.ok) throw new Error(`Radarr error: ${queueRes.status}`)
    if (!movieRes.ok) throw new Error(`Radarr error: ${movieRes.status}`)
    if (!missingRes.ok) throw new Error(`Radarr error: ${missingRes.status}`)

    type QueueRecord = {
      size?: number
      sizeleft?: number
      estimatedCompletionTime?: string
      trackedDownloadState?: string
      status?: string
      movie?: { title?: string }
      title?: string
    }
    const queue = validateResponse<{
      totalRecords?: number
      records?: QueueRecord[]
    }>(
      await queueRes.json(),
      ["totalRecords"],
      [{ path: "records", type: "array" }],
      { adapter: "radarr" }
    )
    const movies = validateArrayResponse(await movieRes.json(), {
      adapter: "radarr",
    })
    const missing = validateResponse<{ totalRecords?: number }>(
      await missingRes.json(),
      ["totalRecords"],
      [],
      { adapter: "radarr" }
    )
    const cutoff = cutoffRes.ok
      ? validateResponse<{ totalRecords?: number }>(
          await cutoffRes.json(),
          ["totalRecords"],
          [],
          { adapter: "radarr", optional: true }
        )
      : { totalRecords: 0 }

    const downloads: DownloadItem[] = []
    if (enableQueue && showActiveDownloads && queue.records) {
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
        // Matches Homepage's formatDownloadState function
        const state = record.trackedDownloadState?.toLowerCase() ?? ""
        let activity: string | undefined
        if (state === "importpending") {
          activity = "Import pending"
        } else if (state === "failedpending") {
          activity = "Failed pending"
        } else if (state.includes("import")) {
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

        // Build title with movie name if available
        const movieName = record.movie?.title ?? record.title
        downloads.push({
          title: movieName ?? "Unknown",
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
      enableQueue,
      downloads,
    }
  },
  toPayload: radarrToPayload,
}
