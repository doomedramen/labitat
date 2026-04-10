import type { ServiceDefinition } from "./types"
import type { DownloadItem } from "@/components/widgets"
import { formatBytes, formatTimeLeft } from "@/lib/utils/format"
import { Tv, Download, AlertTriangle, Search } from "lucide-react"

type SonarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  queued: number
  missing: number
  wanted: number
  series: number
  showActiveDownloads?: boolean
  enableQueue?: boolean
  downloads?: DownloadItem[]
}
import { fetchWithTimeout } from "./fetch-with-timeout"

/**
 * Format episode title with SxxEyy format for consistency with media adapters.
 */
function formatEpisodeTitle(
  title: string,
  options: {
    seriesName?: string
    seasonNumber?: number
    episodeNumber?: number
  } = {}
): string {
  const { seriesName, seasonNumber, episodeNumber } = options

  let formattedTitle = title

  // Add SXXEYY prefix if we have season and episode numbers
  if (seasonNumber != null && episodeNumber != null) {
    formattedTitle = `S${String(seasonNumber).padStart(2, "0")}E${String(episodeNumber).padStart(2, "0")} - ${title}`
  }

  // Prepend series name if available
  if (seriesName) {
    return `${seriesName}: ${formattedTitle}`
  }

  return formattedTitle
}

function sonarrToPayload(data: SonarrData) {
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
        id: "series",
        value: data.series,
        label: "Series",
        icon: Tv,
      },
    ],
    downloads:
      data.enableQueue && data.showActiveDownloads && data.downloads?.length
        ? data.downloads
        : undefined,
  }
}

export const sonarrDefinition: ServiceDefinition<SonarrData> = {
  id: "sonarr",
  name: "Sonarr",
  icon: "sonarr",
  category: "downloads",
  defaultPollingMs: 10_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://sonarr.example.org",
      helperText: "The base URL of your Sonarr instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Sonarr API key",
      helperText: "Found in Sonarr → Settings → General → API Key",
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

    const [queueRes, seriesRes, missingRes, cutoffRes] = await Promise.all([
      fetchWithTimeout(
        `${baseUrl}/api/v3/queue?pageSize=50&includeSeries=true`,
        {
          headers,
        }
      ),
      fetchWithTimeout(`${baseUrl}/api/v3/series`, { headers }),
      fetchWithTimeout(`${baseUrl}/api/v3/wanted/missing?pageSize=1`, {
        headers,
      }),
      fetchWithTimeout(`${baseUrl}/api/v3/wanted/cutoff?pageSize=1`, {
        headers,
      }),
    ])

    if (!queueRes.ok) throw new Error(`Sonarr error: ${queueRes.status}`)
    if (!seriesRes.ok) throw new Error(`Sonarr error: ${seriesRes.status}`)
    if (!missingRes.ok) throw new Error(`Sonarr error: ${missingRes.status}`)

    const queue = await queueRes.json()
    const series = await seriesRes.json()
    const missing = await missingRes.json()
    const cutoff = cutoffRes.ok ? await cutoffRes.json() : { totalRecords: 0 }

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

        // Build title with series info and SXXEYY formatting
        // Uses seasonNumber/episodeNumber from Sonarr API for consistent formatting
        const seriesName = record.series?.title

        // Extract episode title - strip SXXEYY prefix from record.title if present
        // since we'll format it ourselves with seasonNumber/episodeNumber
        let episodeTitle = record.episode?.title ?? record.title ?? "Unknown"
        if (record.title && !record.episode?.title) {
          // Remove leading SXXEYY pattern from record.title (e.g., "S01E01 Test Episode" -> "Test Episode")
          episodeTitle = record.title.replace(/^S\d{2}E\d{2}\s+/, "").trim()
        }

        const displayTitle = formatEpisodeTitle(episodeTitle, {
          seriesName,
          seasonNumber: record.seasonNumber,
          episodeNumber: record.episodeNumber,
        })

        downloads.push({
          title: displayTitle ?? "Unknown",
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
      series: Array.isArray(series) ? series.length : 0,
      showActiveDownloads,
      enableQueue,
      downloads,
    }
  },
  toPayload: sonarrToPayload,
}
