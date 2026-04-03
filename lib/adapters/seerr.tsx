import type { ServiceDefinition } from "./types"
import { StatGrid } from "./widgets"

type SeerrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  pending: number
  processing: number
  approved: number
  available: number
}

function SeerrWidget({ pending, processing, approved, available }: SeerrData) {
  const items = [
    { value: pending, label: "Pending" },
    { value: processing, label: "Processing" },
    { value: approved, label: "Approved" },
    { value: available, label: "Available" },
  ]

  return <StatGrid items={items} />
}

export const seerrDefinition: ServiceDefinition<SeerrData> = {
  id: "seerr",
  name: "Seerr",
  icon: "seerr",
  category: "media",
  defaultPollingMs: 30_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://seerr.home.lab",
      helperText: "The base URL of your Seerr instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Seerr API key",
      helperText: "Found in Settings → General → API Key",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = { "X-Api-Key": config.apiKey }

    const res = await fetch(`${baseUrl}/api/v1/request/count`, { headers })

    if (!res.ok) {
      if (res.status === 401) throw new Error("Invalid API key")
      if (res.status === 404) throw new Error("Seerr not found at this URL")
      throw new Error(`Seerr error: ${res.status}`)
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

  Widget: SeerrWidget,
}
