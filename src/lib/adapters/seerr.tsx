import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

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
        { value: pending, label: "Pending" },
        { value: approved, label: "Approved" },
        { value: available, label: "Available" },
        { value: processing, label: "Processing" },
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

    const res = await fetch(`${baseUrl}/api/v1/request?take=100`, { headers })
    if (!res.ok) throw new Error(`Overseerr error: ${res.status}`)

    const requests = await res.json()
    const results = requests.results ?? []

    const pending = results.filter(
      (r: { status: number }) => r.status === 1
    ).length
    const approved = results.filter(
      (r: { status: number }) => r.status === 2
    ).length
    const available = results.filter(
      (r: { status: number }) => r.status === 3
    ).length
    const processing = results.filter(
      (r: { status: number }) => r.status === 4
    ).length

    return {
      _status: "ok",
      pending,
      approved,
      available,
      processing,
    }
  },
  Widget: SeerrWidget,
}
