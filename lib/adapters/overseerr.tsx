import type { ServiceDefinition } from "./types"
import { StatGrid } from "./widgets"

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

  return <StatGrid items={items} />
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
