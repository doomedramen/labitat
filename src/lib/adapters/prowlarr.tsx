import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

type ProwlarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  queries: number
  grabs: number
  indexers: number
}

function ProwlarrWidget({ queries, grabs, indexers }: ProwlarrData) {
  return (
    <StatGrid
      items={[
        { value: queries, label: "Queries" },
        { value: grabs, label: "Grabs" },
        { value: indexers, label: "Indexers" },
      ]}
    />
  )
}

export const prowlarrDefinition: ServiceDefinition<ProwlarrData> = {
  id: "prowlarr",
  name: "Prowlarr",
  icon: "prowlarr",
  category: "downloads",
  defaultPollingMs: 15_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://prowlarr.example.org",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Prowlarr API key",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = { "X-Api-Key": config.apiKey }

    const [indexerRes, statsRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/indexer`, { headers }),
      fetch(`${baseUrl}/api/v1/indexerstats`, { headers }),
    ])

    if (!indexerRes.ok) throw new Error(`Prowlarr error: ${indexerRes.status}`)

    const indexers = await indexerRes.json()
    const stats = await statsRes.json()

    return {
      _status: "ok",
      queries: stats.numberOfQueries ?? 0,
      grabs: stats.numberOfGrabs ?? 0,
      indexers: indexers.length ?? 0,
    }
  },
  Widget: ProwlarrWidget,
}
