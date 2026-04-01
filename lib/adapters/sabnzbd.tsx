import type { ServiceDefinition } from "./types"
import { DownloadList, StatGrid, type DownloadItem } from "./widgets"

type SabnzbdData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  queue: number
  speed: string
  timeleft: string
  showDownloads?: boolean
  downloads?: DownloadItem[]
}

function formatTime(timeLeft: string): string {
  if (!timeLeft || timeLeft === "-") return "∞"
  return timeLeft
}

function SabnzbdWidget({
  queue,
  speed,
  timeleft,
  showDownloads,
  downloads,
}: SabnzbdData) {
  const items = [
    { value: speed, label: "Speed" },
    { value: queue, label: "Queue" },
    { value: timeleft, label: "Time Left" },
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

export const sabnzbdDefinition: ServiceDefinition<SabnzbdData> = {
  id: "sabnzbd",
  name: "SABnzbd",
  icon: "sabnzbd",
  category: "downloads",
  defaultPollingMs: 5_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://sabnzbd.home.lab",
      helperText: "The base URL of your SABnzbd instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your SABnzbd API key",
      helperText: "Found in Config → General → API Key",
    },
    {
      key: "showDownloads",
      label: "Show active downloads",
      type: "boolean",
      helperText: "Display currently downloading items with progress",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const showDownloads = config.showDownloads === "true"
    const url = `${baseUrl}/api?mode=queue&output=json&apikey=${config.apiKey}${showDownloads ? "&nzo_type=active" : ""}`

    const res = await fetch(url)

    if (!res.ok) {
      if (res.status === 401) throw new Error("Invalid API key")
      if (res.status === 404) throw new Error("SABnzbd not found at this URL")
      throw new Error(`SABnzbd error: ${res.status}`)
    }

    const data = await res.json()

    if (data.error) {
      throw new Error(data.error)
    }

    const queue = data.queue ?? {}

    // Build download list for active downloads
    let downloads: DownloadItem[] = []
    if (showDownloads && Array.isArray(queue.slots)) {
      downloads = queue.slots.map((slot: Record<string, unknown>) => ({
        title: (slot.filename as string) ?? "Unknown",
        progress: parseFloat((slot.percentage as string) ?? "0") || 0,
        timeLeft: formatTime((slot.timeleft as string) ?? ""),
        activity: "downloading",
        size: (slot.size as string) ?? "",
      }))
    }

    return {
      _status: "ok" as const,
      queue: queue.noofslots ?? 0,
      speed: queue.speed ?? "0 B/s",
      timeleft: queue.timeleft ?? "0:00:00",
      showDownloads,
      downloads,
    }
  },

  Widget: SabnzbdWidget,
}
