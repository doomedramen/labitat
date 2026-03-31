import type { ServiceDefinition } from "./types"

type ImmichData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  users: number
  photos: number
  videos: number
  storage: number
}

function formatStorage(bytes: number): string {
  if (bytes >= 1_000_000_000_000) {
    return `${(bytes / 1_000_000_000_000).toFixed(1)} TB`
  }
  if (bytes >= 1_000_000_000) {
    return `${(bytes / 1_000_000_000).toFixed(1)} GB`
  }
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`
  }
  return `${(bytes / 1_000).toFixed(0)} KB`
}

function ImmichWidget({ users, photos, videos, storage }: ImmichData) {
  const items = [
    { value: users, label: "Users" },
    { value: photos, label: "Photos" },
    { value: videos, label: "Videos" },
    { value: formatStorage(storage), label: "Storage" },
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

export const immichDefinition: ServiceDefinition<ImmichData> = {
  id: "immich",
  name: "Immich",
  icon: "immich",
  category: "media",
  defaultPollingMs: 60_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://immich.home.lab",
      helperText: "The base URL of your Immich instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Immich API key",
      helperText: "Found in Account Settings → API Keys",
    },
    {
      key: "version",
      label: "API Version",
      type: "select",
      options: [
        { value: "1", label: "v1" },
        { value: "2", label: "v2" },
      ],
      helperText: "Immich API version (v2 for Immich 1.85+)",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const version = config.version ?? "1"
    const headers = {
      "x-api-key": config.apiKey,
      "Content-Type": "application/json",
    }

    // Get version to determine correct stats endpoint
    const versionEndpoint = version === "2" ? "/server/version" : "/server-info/version"
    const versionRes = await fetch(`${baseUrl}/api${versionEndpoint}`, { headers })

    let statsEndpoint = "/server-info/stats"
    if (version === "1" && versionRes.ok) {
      const versionData = await versionRes.json()
      // Use statistics endpoint for Immich > 1.84
      if (versionData?.major > 1 || (versionData?.major === 1 && versionData?.minor > 84)) {
        statsEndpoint = "/server-info/statistics"
      }
    } else if (version === "2") {
      statsEndpoint = "/server/statistics"
    }

    const statsRes = await fetch(`${baseUrl}/api${statsEndpoint}`, { headers })

    if (!statsRes.ok) {
      if (statsRes.status === 401) throw new Error("Invalid API key")
      if (statsRes.status === 404) throw new Error("Immich not found at this URL")
      throw new Error(`Immich error: ${statsRes.status}`)
    }

    const statsData = await statsRes.json()

    return {
      _status: "ok" as const,
      users: statsData.usageByUser?.length ?? 0,
      photos: statsData.photos ?? 0,
      videos: statsData.videos ?? 0,
      storage: statsData.usage ?? 0,
    }
  },

  Widget: ImmichWidget,
}
