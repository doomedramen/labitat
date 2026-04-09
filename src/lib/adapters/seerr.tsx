import type { ServiceDefinition } from "./types"
import { Clock, Check, Package, RefreshCw } from "lucide-react"

type SeerrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  pending: number
  approved: number
  available: number
  processing: number
}

function seerrToPayload(data: SeerrData) {
  return {
    stats: [
      {
        id: "pending",
        value: data.pending,
        label: "Pending",
        icon: Clock,
        tooltip: "Pending",
      },
      {
        id: "approved",
        value: data.approved,
        label: "Approved",
        icon: Check,
        tooltip: "Approved",
      },
      {
        id: "available",
        value: data.available,
        label: "Available",
        icon: Package,
        tooltip: "Available",
      },
      {
        id: "processing",
        value: data.processing,
        label: "Processing",
        icon: RefreshCw,
        tooltip: "Processing",
      },
    ],
  }
}

export const seerrDefinition: ServiceDefinition<SeerrData> = {
  id: "seerr",
  name: "Overseerr (Seerr)",
  icon: "overseerr",
  category: "media",
  defaultPollingMs: 15_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://overseerr.example.org",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Overseerr API key",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = { "X-Api-Key": config.apiKey }

    const res = await fetch(`${baseUrl}/api/v1/request/count`, { headers })
    if (!res.ok) throw new Error(`Overseerr error: ${res.status}`)

    const counts = await res.json()

    return {
      _status: "ok",
      pending: counts.pending ?? 0,
      approved: counts.approved ?? 0,
      available: counts.available ?? 0,
      processing: counts.processing ?? 0,
    }
  },
  toPayload: seerrToPayload,
}
