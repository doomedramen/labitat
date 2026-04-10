import type { ServiceDefinition } from "./types"
import { Users, Image as ImageIcon, Video, HardDrive } from "lucide-react"

type ImmichData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  users: number
  photos: number
  videos: number
  storage: number
}
import { fetchWithTimeout } from "./fetch-with-timeout"

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

function immichToPayload(data: ImmichData) {
  return {
    stats: [
      {
        id: "users",
        value: data.users,
        label: "Users",
        icon: Users,
      },
      {
        id: "photos",
        value: data.photos,
        label: "Photos",
        icon: ImageIcon,
      },
      {
        id: "videos",
        value: data.videos,
        label: "Videos",
        icon: Video,
      },
      {
        id: "storage",
        value: formatStorage(data.storage),
        label: "Storage",
        icon: HardDrive,
      },
    ],
  }
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
      placeholder: "https://immich.example.org",
      helperText: "The base URL of your Immich instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Immich password or API key",
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
    const versionEndpoint =
      version === "2" ? "/server/version" : "/server-info/version"
    const versionRes = await fetchWithTimeout(
      `${baseUrl}/api${versionEndpoint}`,
      {
        headers,
      }
    )

    let statsEndpoint = "/server-info/stats"
    if (version === "1" && versionRes.ok) {
      const versionData = await versionRes.json()
      // Use statistics endpoint for Immich > 1.84
      if (
        versionData?.major > 1 ||
        (versionData?.major === 1 && versionData?.minor > 84)
      ) {
        statsEndpoint = "/server-info/statistics"
      }
    } else if (version === "2") {
      statsEndpoint = "/server/statistics"
    }

    const statsRes = await fetchWithTimeout(`${baseUrl}/api${statsEndpoint}`, {
      headers,
    })

    if (!statsRes.ok) {
      if (statsRes.status === 401) throw new Error("Invalid API key")
      if (statsRes.status === 404)
        throw new Error("Immich not found at this URL")
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

  toPayload: immichToPayload,
}
