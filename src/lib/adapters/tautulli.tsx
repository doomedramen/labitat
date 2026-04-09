import type { ServiceDefinition } from "./types"
import {
  StatGrid,
  ActiveStreamList,
  type ActiveStream,
} from "@/components/widgets"
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
  return (
    <div className="space-y-2">
      <StatGrid
        items={[
          {
            value: streamCount,
            label: "Streams",
            icon: <Play className="h-3 w-3" />,
            tooltip: "Streams",
          },
          {
            value: totalBandwidth,
            label: "Bandwidth",
            icon: <Activity className="h-3 w-3" />,
            tooltip: "Bandwidth",
          },
          {
            value: transcodeStreams,
            label: "Transcoding",
            icon: <Cpu className="h-3 w-3" />,
            tooltip: "Transcoding",
          },
          {
            value: directPlayStreams,
            label: "Direct Play",
            icon: <Monitor className="h-3 w-3" />,
            tooltip: "Direct Play",
          },
          {
            value: directStreamStreams,
            label: "Direct Stream",
            icon: <Radio className="h-3 w-3" />,
            tooltip: "Direct Stream",
          },
        ]}
      />
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
        user: string
        progress_percent: number
        duration: number
        state: string
        video_decision: string
        bandwidth: number
      }) => {
        totalBandwidth += s.bandwidth ?? 0

        if (s.video_decision === "transcode") transcodeStreams++
        else if (s.video_decision === "direct play") directPlayStreams++
        else if (s.video_decision === "copy") directStreamStreams++

        return {
          title: s.title ?? "Unknown",
          user: s.user ?? "Unknown",
          progress: ((s.progress_percent ?? 0) * (s.duration ?? 0)) / 100,
          duration: s.duration ?? 0,
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
