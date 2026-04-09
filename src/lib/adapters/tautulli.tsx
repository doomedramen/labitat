import type { ServiceDefinition } from "./types"
import type { ActiveStream } from "@/components/widgets"
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

function tautulliToPayload(data: TautulliData) {
  return {
    stats: [
      {
        id: "streams",
        value: data.streamCount,
        label: "Streams",
        icon: Play,
        tooltip: "Streams",
      },
      {
        id: "bandwidth",
        value: data.totalBandwidth,
        label: "Bandwidth",
        icon: Activity,
        tooltip: "Bandwidth",
      },
      {
        id: "transcoding",
        value: data.transcodeStreams,
        label: "Transcoding",
        icon: Cpu,
        tooltip: "Transcoding",
      },
      {
        id: "direct-play",
        value: data.directPlayStreams,
        label: "Direct Play",
        icon: Monitor,
        tooltip: "Direct Play",
      },
      {
        id: "direct-stream",
        value: data.directStreamStreams,
        label: "Direct Stream",
        icon: Radio,
        tooltip: "Direct Stream",
      },
    ],
    streams: data.sessions?.length ? data.sessions : undefined,
  }
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
        grandparent_title?: string
        parent_title?: string
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

        // subtitle = series/show name for TV episodes; omit for movies
        const subtitle =
          s.grandparent_title ||
          (s.parent_title !== s.title ? s.parent_title : undefined) ||
          undefined

        // Tautulli API returns view_offset and duration in milliseconds
        const viewOffsetMs =
          s.view_offset ?? ((s.progress_percent ?? 0) * (s.duration ?? 0)) / 100

        const progressSec = viewOffsetMs / 1000
        const durationSec = (s.duration ?? 0) / 1000

        return {
          title: s.title ?? "Unknown",
          subtitle,
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
  toPayload: tautulliToPayload,
}
