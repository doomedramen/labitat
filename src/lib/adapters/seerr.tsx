import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"
import { Clock, Check, Package, RefreshCw } from "lucide-react"

type SeerrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  pending: number
  approved: number
  available: number
  processing: number
}

function SeerrWidget({ pending, approved, available, processing }: SeerrData) {
  return (
    <StatGrid
      items={[
        {
          value: pending,
          label: "Pending",
          icon: <Clock className="h-3 w-3" />,
          tooltip: "Pending",
        },
        {
          value: approved,
          label: "Approved",
          icon: <Check className="h-3 w-3" />,
          tooltip: "Approved",
        },
        {
          value: available,
          label: "Available",
          icon: <Package className="h-3 w-3" />,
          tooltip: "Available",
        },
        {
          value: processing,
          label: "Processing",
          icon: <RefreshCw className="h-3 w-3" />,
          tooltip: "Processing",
        },
      ]}
    />
  )
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
  Widget: SeerrWidget,
}
