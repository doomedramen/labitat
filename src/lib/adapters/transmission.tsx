import type { ServiceDefinition } from "./types"
import type { DownloadItem } from "@/components/widgets"
import { ArrowDown, ArrowUp, Download, Upload } from "lucide-react"

type TransmissionData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  leech: number
  download: number
  seed: number
  upload: number
  downloads?: DownloadItem[]
}

function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) {
    return `${(bytes / 1_000_000_000).toFixed(1)} GB`
  }
  if (bytes >= 1_000_000) {
    return `${(bytes / 1_000_000).toFixed(1)} MB`
  }
  if (bytes >= 1_000) {
    return `${(bytes / 1_000).toFixed(1)} KB`
  }
  return `${bytes.toFixed(0)} B`
}

function formatTime(seconds: number): string {
  if (seconds < 0 || !isFinite(seconds)) return "∞"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  return `${m}:${s.toString().padStart(2, "0")}`
}

function transmissionToPayload(data: TransmissionData) {
  return {
    stats: [
      {
        id: "leech",
        value: data.leech,
        label: "Leech",
        icon: Download,
      },
      {
        id: "down",
        value: `${formatBytes(data.download)}/s`,
        label: "Down",
        icon: ArrowDown,
      },
      {
        id: "seed",
        value: data.seed,
        label: "Seed",
        icon: Upload,
      },
      {
        id: "upload",
        value: `${formatBytes(data.upload)}/s`,
        label: "Upload",
        icon: ArrowUp,
      },
    ],
    downloads: data.downloads?.length ? data.downloads : undefined,
  }
}

export const transmissionDefinition: ServiceDefinition<TransmissionData> = {
  id: "transmission",
  name: "Transmission",
  icon: "transmission",
  category: "downloads",
  defaultPollingMs: 5_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://transmission.example.org",
      helperText: "The base URL of your Transmission Web UI",
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: true,
      placeholder: "admin",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: true,
      placeholder: "Your Transmission password",
    },
    {
      key: "rpcUrl",
      label: "RPC Path",
      type: "text",
      required: false,
      placeholder: "/transmission/",
      helperText: "Default: /transmission/",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const rpcUrl = config.rpcUrl ?? "/transmission/"
    const rpcEndpoint = `${baseUrl}${rpcUrl}rpc`

    const auth = Buffer.from(`${config.username}:${config.password}`).toString(
      "base64"
    )

    // First request to get CSRF token (Transmission returns 409 with token)
    let csrfToken = ""
    try {
      const initRes = await fetch(rpcEndpoint, {
        method: "POST",
        headers: {
          Authorization: `Basic ${auth}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          method: "torrent-get",
          arguments: {
            fields: [
              "name",
              "percentDone",
              "rateDownload",
              "rateUpload",
              "sizeWhenDone",
              "left",
              "eta",
            ],
          },
        }),
      })

      // Transmission returns 409 with the CSRF token in header
      csrfToken = initRes.headers.get("X-Transmission-Session-Id") ?? ""
    } catch {
      // Ignore initial error, we'll retry with token
    }

    // Now make the actual request with CSRF token
    const res = await fetch(rpcEndpoint, {
      method: "POST",
      headers: {
        Authorization: `Basic ${auth}`,
        "Content-Type": "application/json",
        "X-Transmission-Session-Id": csrfToken,
      },
      body: JSON.stringify({
        method: "torrent-get",
        arguments: {
          fields: [
            "name",
            "percentDone",
            "rateDownload",
            "rateUpload",
            "sizeWhenDone",
            "left",
            "eta",
          ],
        },
      }),
    })

    if (!res.ok) {
      if (res.status === 401) throw new Error("Invalid username or password")
      if (res.status === 404)
        throw new Error("Transmission not found at this URL")
      throw new Error(`Transmission error: ${res.status}`)
    }

    const data = await res.json()
    const torrents = data.arguments?.torrents ?? []

    // Calculate stats (matching Homepage logic)
    const rateDl = torrents.reduce(
      (acc: number, t: { rateDownload: number }) => acc + (t.rateDownload ?? 0),
      0
    )
    const rateUl = torrents.reduce(
      (acc: number, t: { rateUpload: number }) => acc + (t.rateUpload ?? 0),
      0
    )
    const completed = torrents.filter(
      (t: { percentDone: number }) => t.percentDone === 1
    ).length
    const leech = torrents.length - completed

    // Build download list for active torrents (not completed, not stalled)
    const downloads: DownloadItem[] = torrents
      .filter(
        (t: { percentDone: number; left: number }) =>
          t.percentDone < 1 && t.left > 0
      )
      .sort(
        (a: { percentDone: number }, b: { percentDone: number }) =>
          a.percentDone - b.percentDone
      )
      .map((t: Record<string, unknown>) => ({
        title: (t.name as string) ?? "Unknown",
        progress: ((t.percentDone as number) ?? 0) * 100,
        timeLeft: formatTime((t.eta as number) ?? -1),
        activity: "downloading",
        size: formatBytes((t.sizeWhenDone as number) ?? 0),
      }))

    return {
      _status: "ok" as const,
      leech,
      download: rateDl,
      seed: completed,
      upload: rateUl,
      downloads,
    }
  },

  toPayload: transmissionToPayload,
}
