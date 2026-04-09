import type { ServiceDefinition } from "./types"
import { ActiveStreamList, type ActiveStream } from "@/components/widgets"
import { WidgetStatGrid } from "@/components/dashboard/item/widget-stat-grid"
import { Activity, Cpu, Monitor, Play, Radio } from "lucide-react"

type TautulliData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  streamCount: number
  totalBandwidth: string
  transcodeStreams: number
  directPlayStreams: number
  directStreamStreams: number
  sessions?: ActiveStream[]
}

function formatBytes(bytes: number): string {
  if (bytes === 0) return "0 B"
  const k = 1024
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(k))
  return `${(bytes / Math.pow(k, i)).toFixed(1)} ${sizes[i]}`
}

function TautulliWidget({
  streamCount,
  totalBandwidth,
  transcodeStreams,
  directPlayStreams,
  directStreamStreams,
  sessions,
}: TautulliData) {
  const items = [
    {
      id: "streams",
      value: streamCount,
      label: "Streams",
      icon: <Play className="h-3 w-3" />,
      tooltip: "Streams",
    },
    {
      id: "bandwidth",
      value: totalBandwidth,
      label: "Bandwidth",
      icon: <Activity className="h-3 w-3" />,
      tooltip: "Bandwidth",
    },
    {
      id: "transcoding",
      value: transcodeStreams,
      label: "Transcoding",
      icon: <Cpu className="h-3 w-3" />,
      tooltip: "Transcoding",
    },
    {
      id: "direct-play",
      value: directPlayStreams,
      label: "Direct Play",
      icon: <Monitor className="h-3 w-3" />,
      tooltip: "Direct Play",
    },
    {
      id: "direct-stream",
      value: directStreamStreams,
      label: "Direct Stream",
      icon: <Radio className="h-3 w-3" />,
      tooltip: "Direct Stream",
    },
  ]

  return (
    <div className="space-y-2">
      <WidgetStatGrid items={items} />
      {sessions && sessions.length > 0 && (
        <ActiveStreamList streams={sessions} />
      )}
    </div>
  )
}

export const tautulliDefinition: ServiceDefinition<TautulliData> = {
  id: "tautulli",
  name: "Tautulli",
  icon: "tautulli",
  category: "media",
  defaultPollingMs: 10_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://tautulli.example.org",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Tautulli API key",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const url = `${baseUrl}/api/v2?apikey=${config.apiKey}&cmd=get_activity`

    const res = await fetch(url)
    if (!res.ok) throw new Error(`Tautulli error: ${res.status}`)

    const data = await res.json()
    const sessions = data.response?.data?.sessions ?? []

    let totalBandwidth = 0
    let transcodeStreams = 0
    let directPlayStreams = 0
    let directStreamStreams = 0

    const activeStreams: ActiveStream[] = sessions.map(
      (s: {
        title: string
        grandparentTitle?: string
        parentTitle?: string
        user: string
        progress_percent: number
        duration: number
        view_offset: number
        state: string
        video_decision: string
        bandwidth: number
      }) => {
        totalBandwidth += s.bandwidth ?? 0

        if (s.video_decision === "transcode") transcodeStreams++
        else if (s.video_decision === "direct play") directPlayStreams++
        else if (s.video_decision === "copy") directStreamStreams++

        // Build full title: "Show Name - Episode Title" for TV, just title for movies
        let fullTitle = s.title ?? "Unknown"
        if (s.grandparentTitle && s.title) {
          fullTitle = `${s.grandparentTitle} - ${s.title}`
        } else if (s.parentTitle && s.title && s.parentTitle !== s.title) {
          fullTitle = `${s.parentTitle} - ${s.title}`
        }

        // Use view_offset for elapsed time, fall back to calculating from progress_percent
        // Tautulli API returns view_offset and duration in milliseconds
        const viewOffsetMs =
          s.view_offset ?? ((s.progress_percent ?? 0) * (s.duration ?? 0)) / 100

        // Convert to seconds for display
        const progressSec = viewOffsetMs / 1000
        const durationSec = (s.duration ?? 0) / 1000

        return {
          title: fullTitle,
          user: s.user ?? "Unknown",
          progress: progressSec,
          duration: durationSec,
          state: s.state === "paused" ? "paused" : "playing",
        }
      }
    )

    return {
      _status: "ok",
      streamCount: sessions.length,
      totalBandwidth: formatBytes(totalBandwidth) + "/s",
      transcodeStreams,
      directPlayStreams,
      directStreamStreams,
      sessions: activeStreams,
    }
  },
  Widget: TautulliWidget,
}
