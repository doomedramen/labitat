import type { ServiceDefinition } from "./types"

type OverseerrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  pending: number
  processing: number
  approved: number
  available: number
}

function OverseerrWidget({
  pending,
  processing,
  approved,
  available,
}: OverseerrData) {
  const items = [
    { value: pending, label: "Pending" },
    { value: processing, label: "Processing" },
    { value: approved, label: "Approved" },
    { value: available, label: "Available" },
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

export const overseerrDefinition: ServiceDefinition<OverseerrData> = {
  id: "overseerr",
  name: "Overseerr",
  icon: "overseerr",
  category: "media",
  defaultPollingMs: 30_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://overseerr.home.lab",
      helperText: "The base URL of your Overseerr instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Overseerr API key",
      helperText: "Found in Settings → General → API Key",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = { "X-Api-Key": config.apiKey }

    const res = await fetch(`${baseUrl}/api/v1/request/count`, { headers })

    if (!res.ok) {
      if (res.status === 401) throw new Error("Invalid API key")
      if (res.status === 404) throw new Error("Overseerr not found at this URL")
      throw new Error(`Overseerr error: ${res.status}`)
    }

    const data = await res.json()

    return {
      _status: "ok" as const,
      pending: data.pending ?? 0,
      processing: data.processing ?? 0,
      approved: data.approved ?? 0,
      available: data.available ?? 0,
    }
  },

  Widget: OverseerrWidget,
}
