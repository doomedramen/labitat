import type { ServiceDefinition } from "./types"

type LidarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  queued: number
  wanted: number
  artists: number
}

function LidarrWidget({ queued, wanted, artists }: LidarrData) {
  const items = [
    { value: wanted, label: "Wanted" },
    { value: queued, label: "Queued" },
    { value: artists, label: "Artists" },
  ]

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-1.5 text-xs">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1 text-center"
        >
          <span className="font-medium text-foreground tabular-nums">
            {item.value}
          </span>
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export const lidarrDefinition: ServiceDefinition<LidarrData> = {
  id: "lidarr",
  name: "Lidarr",
  icon: "lidarr",
  category: "downloads",
  defaultPollingMs: 10_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://lidarr.home.lab",
      helperText: "The base URL of your Lidarr instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Lidarr API key",
      helperText: "Found in Settings → General → Security",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = { "X-Api-Key": config.apiKey }

    const [artistsRes, wantedRes, queueRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/artist`, { headers }),
      fetch(`${baseUrl}/api/v1/wanted/missing`, { headers }),
      fetch(`${baseUrl}/api/v1/queue/status`, { headers }),
    ])

    if (!artistsRes.ok) {
      if (artistsRes.status === 401) throw new Error("Invalid API key")
      if (artistsRes.status === 404)
        throw new Error("Lidarr not found at this URL")
      throw new Error(`Lidarr error: ${artistsRes.status}`)
    }

    const artistsData = await artistsRes.json()
    const wantedData = wantedRes.ok
      ? await wantedRes.json()
      : { totalRecords: 0 }
    const queueData = queueRes.ok ? await queueRes.json() : { totalCount: 0 }

    return {
      _status: "ok" as const,
      queued: queueData.totalCount ?? 0,
      wanted: wantedData.totalRecords ?? 0,
      artists: artistsData.length,
    }
  },

  Widget: LidarrWidget,
}
