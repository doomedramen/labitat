import type { ServiceDefinition } from "./types"
import type { ActiveStream } from "@/components/widgets"
import { formatBytes } from "@/lib/utils/format"
import { buildStreamsTooltip, formatMediaTitle } from "@/lib/utils/format-media"
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
import { fetchWithTimeout } from "./fetch-with-timeout"

function tautulliToPayload(data: TautulliData) {
  return {
    stats: [
      {
        id: "streams",
        value: data.streamCount,
        label: "Streams",
        icon: Play,
        tooltip: buildStreamsTooltip(data.sessions ?? []),
      },
      {
        id: "bandwidth",
        value: data.totalBandwidth,
        label: "Bandwidth",
        icon: Activity,
      },
      {
        id: "transcoding",
        value: data.transcodeStreams,
        label: "Transcoding",
        icon: Cpu,
      },
      {
        id: "direct-play",
        value: data.directPlayStreams,
        label: "Direct Play",
        icon: Monitor,
      },
      {
        id: "direct-stream",
        value: data.directStreamStreams,
        label: "Direct Stream",
        icon: Radio,
      },
    ],
    streams: data.sessions?.length ? data.sessions : undefined,
    // Default to 4 stats: hide "streams" count, show bandwidth/transcoding/direct-play/direct-stream
    defaultActiveIds: [
      "bandwidth",
      "transcoding",
      "direct-play",
      "direct-stream",
    ],
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

    const res = await fetchWithTimeout(url)
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
        media_type?: string
        season_number?: number
        episode_number?: number
        user: string
        progress_percent: number
        duration: number
        view_offset: number
        state: string
        video_decision: string
        video_decision_text?: string
        transcode_decision?: string
        bandwidth: number
        stream_container_direct_play?: number
        stream_container_video_decision?: string
        session_key?: string
      }) => {
        totalBandwidth += s.bandwidth ?? 0

        if (s.video_decision === "transcode") transcodeStreams++
        else if (s.video_decision === "direct play") directPlayStreams++
        else if (s.video_decision === "copy") directStreamStreams++

        // Determine media type for consistent formatting
        const mediaType = s.media_type ?? "video"

        // Format title with SxxEyy for TV episodes (consistent with Plex/Jellyfin/Emby)
        const { title: formattedTitle, subtitle } = formatMediaTitle(
          s.title ?? "Unknown",
          {
            type: mediaType === "episode" ? "episode" : undefined,
            seriesName: s.grandparent_title,
            season: s.season_number,
            episode: s.episode_number,
          }
        )

        // Tautulli API returns view_offset and duration in milliseconds
        const viewOffsetMs =
          s.view_offset ?? ((s.progress_percent ?? 0) * (s.duration ?? 0)) / 100

        const progressSec = viewOffsetMs / 1000
        const durationSec = (s.duration ?? 0) / 1000

        // Build transcoding info (consistent with Jellyfin/Emby)
        const isDirectPlay = s.video_decision === "direct play"
        const isTranscoding = s.video_decision === "transcode"
        const transcodingInfo = isTranscoding
          ? {
              isDirect: false,
              hardwareDecoding: s.transcode_decision?.includes("hw") ?? false,
              hardwareEncoding: s.transcode_decision?.includes("hw") ?? false,
            }
          : isDirectPlay
            ? {
                isDirect: true,
                hardwareDecoding: false,
                hardwareEncoding: false,
              }
            : undefined

        return {
          title: formattedTitle,
          subtitle,
          user: s.user ?? "Unknown",
          progress: progressSec,
          duration: durationSec,
          state: s.state === "paused" ? "paused" : "playing",
          streamId: s.session_key,
          transcoding: transcodingInfo,
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
