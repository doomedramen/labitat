import type { ServiceDefinition } from "./types"
import { StatGrid, DownloadList, type DownloadItem } from "@/components/widgets"

type SABnzbdData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  speed: string
  remaining: string
  queueSize: number
  downloading: boolean
  downloads?: DownloadItem[]
}

function SABnzbdWidget({
  speed,
  remaining,
  queueSize,
  downloading,
  downloads,
}: SABnzbdData) {
  return (
    <div className="space-y-2">
      <StatGrid
        items={[
          { value: downloading ? speed : "Idle", label: "Speed" },
          { value: downloading ? remaining : "—", label: "Remaining" },
          { value: queueSize, label: "Queue" },
        ]}
      />
      {downloads && downloads.length > 0 && (
        <DownloadList downloads={downloads} />
      )}
    </div>
  )
}

export const sabnzbdDefinition: ServiceDefinition<SABnzbdData> = {
  id: "sabnzbd",
  name: "SABnzbd",
  icon: "sabnzbd",
  category: "downloads",
  defaultPollingMs: 10_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://sabnzbd.example.org",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your SABnzbd API key",
    },
    {
      key: "showDownloads",
      label: "Show active downloads",
      type: "boolean",
      defaultChecked: true,
      helperText: "Display currently downloading items with progress",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const showDownloads = config.showDownloads === "true"
    const url = `${baseUrl}/api?output=json&apikey=${config.apiKey}&mode=queue`

    const res = await fetch(url)
    if (!res.ok) throw new Error(`SABnzbd error: ${res.status}`)

    const data = await res.json()
    const queue = data.queue ?? {}
    const slots: Array<{
      filename: string
      percentage: string
      timeleft: string
      mb: string
      mbleft: string
    }> = queue.slots ?? []

    const downloads: DownloadItem[] = showDownloads
      ? slots.slice(0, 3).map((slot) => ({
          title: slot.filename,
          progress: parseFloat(slot.percentage ?? "0"),
          timeLeft: slot.timeleft,
          activity: "downloading",
          size: slot.mb ? `${parseFloat(slot.mb).toFixed(0)} MB` : undefined,
        }))
      : []

    return {
      _status: "ok",
      speed: queue.speed ?? "0 B/s",
      remaining: queue.timeleft ?? "—",
      queueSize: queue.noofslots ?? 0,
      downloading: queue.status === "Downloading",
      downloads,
    }
  },
  Widget: SABnzbdWidget,
}
