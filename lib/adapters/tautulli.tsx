import type { ServiceDefinition } from "./types"
import { ActiveStreamList } from "./widgets"

type TautulliSession = {
  title: string
  parent_title?: string
  grandparent_title?: string
  full_title: string
  user: string
  progress: number
  episode_number?: number
  season_number?: number
  state?: "playing" | "paused"
}

type TautulliData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  showActiveStreams?: boolean
  sessions?: TautulliSession[]
}

function TautulliWidget({ showActiveStreams, sessions }: TautulliData) {
  if (!showActiveStreams || !sessions || sessions.length === 0) {
    return (
      <div className="flex flex-col pb-1 mx-1">
        <div className="text-xs relative h-5 w-full rounded-md bg-muted/50 mt-1">
          <span className="absolute left-2 text-xs mt-[2px]">-</span>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col pb-1 mx-1">
      <ActiveStreamList
        streams={sessions.map((session) => ({
          title: session.full_title,
          user: session.user,
          progress: session.progress,
          state: session.state,
        }))}
      />
    </div>
  )
}

export const tautulliDefinition: ServiceDefinition<TautulliData> = {
  id: "tautulli",
  name: "Tautulli",
  icon: "tautulli",
  category: "media",
  defaultPollingMs: 5_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://tautulli.home.lab",
      helperText: "The base URL of your Tautulli instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Tautulli API key",
      helperText: "Found in Settings → Web Interface → API",
    },
    {
      key: "showActiveStreams",
      label: "Show active streams",
      type: "boolean",
      helperText: "Display currently playing media",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const params = new URLSearchParams({ apikey: config.apiKey })
    const showActiveStreams = config.showActiveStreams === "true"

    // Get activity (like Homepage - only fetch get_activity)
    const activityRes = await fetch(`${baseUrl}/api/v2?cmd=get_activity&${params}`)

    if (!activityRes.ok) {
      if (activityRes.status === 401) throw new Error("Invalid API key")
      if (activityRes.status === 404)
        throw new Error("Tautulli not found at this URL")
      throw new Error(`Tautulli error: ${activityRes.status}`)
    }

    const activityData = await activityRes.json()

    if (activityData.response?.result !== "success") {
      throw new Error(activityData.response?.message ?? "Tautulli API error")
    }

    // Get active sessions if enabled
    let sessions: TautulliSession[] = []
    if (showActiveStreams) {
      const sessionsList = activityData.response?.data?.sessions ?? []
      sessions = sessionsList.map((s: Record<string, unknown>) => ({
        title: (s.title as string) ?? "",
        parent_title: (s.parent_title as string) ?? "",
        grandparent_title: (s.grandparent_title as string) ?? "",
        full_title: (s.full_title as string) ?? "",
        user: (s.friendly_name as string) ?? (s.user as string) ?? "",
        // view_offset is in milliseconds, convert to seconds
        progress: ((s.view_offset as number) ?? 0) / 1000,
        episode_number: s.episode_number as number | undefined,
        season_number: s.season_number as number | undefined,
        state: (s.state as string) === "paused" ? "paused" : "playing",
      }))
    }

    return {
      _status: "ok" as const,
      showActiveStreams,
      sessions,
    }
  },

  Widget: TautulliWidget,
}
