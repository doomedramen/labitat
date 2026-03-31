import type { ServiceDefinition } from "./types"

type LidarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  queued: number
  missing: number
  artists: number
  albums: number
}

function LidarrWidget({ queued, missing, artists, albums }: LidarrData) {
  const items = [
    { value: queued, label: "Queued" },
    { value: missing, label: "Missing" },
    { value: artists, label: "Artists" },
    { value: albums, label: "Albums" },
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

    const [artistsRes, albumRes, queueRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/artist`, { headers }),
      fetch(`${baseUrl}/api/v1/album`, { headers }),
      fetch(`${baseUrl}/api/v1/queue/status`, { headers }),
    ])

    if (!artistsRes.ok) {
      if (artistsRes.status === 401) throw new Error("Invalid API key")
      if (artistsRes.status === 404)
        throw new Error("Lidarr not found at this URL")
      throw new Error(`Lidarr error: ${artistsRes.status}`)
    }

    const artistsData = await artistsRes.json()
    const albumData = await albumRes.json()
    const queueData = queueRes.ok ? await queueRes.json() : { totalCount: 0 }

    // Calculate missing albums (monitored but not downloaded)
    let missing = 0
    for (const album of albumData) {
      if (album.monitored && !album.grabbed) {
        missing++
      }
    }

    return {
      _status: "ok" as const,
      queued: queueData.totalCount ?? 0,
      missing,
      artists: artistsData.length,
      albums: albumData.length,
    }
  },

  Widget: LidarrWidget,
}
