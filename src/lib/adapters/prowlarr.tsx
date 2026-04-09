import type { ServiceDefinition } from "./types"
import { Search, Download, List } from "lucide-react"

type ProwlarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  queries: number
  grabs: number
  indexers: number
}

function prowlarrToPayload(data: ProwlarrData) {
  return {
    stats: [
      {
        id: "queries",
        value: data.queries,
        label: "Queries",
        icon: Search,
      },
      {
        id: "grabs",
        value: data.grabs,
        label: "Grabs",
        icon: Download,
      },
      {
        id: "indexers",
        value: data.indexers,
        label: "Indexers",
        icon: List,
      },
    ],
  }
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
    const stats = statsRes.ok ? await statsRes.json() : {}

    // indexerstats returns { indexers: [...], userAgents: [...] }
    // each indexer has numberOfQueries and numberOfGrabs
    const indexerStats: Array<{
      numberOfQueries?: number
      numberOfGrabs?: number
    }> = stats.indexers ?? []
    const queries = indexerStats.reduce(
      (sum, i) => sum + (i.numberOfQueries ?? 0),
      0
    )
    const grabs = indexerStats.reduce(
      (sum, i) => sum + (i.numberOfGrabs ?? 0),
      0
    )

    return {
      _status: "ok",
      queries,
      grabs,
      indexers: Array.isArray(indexers) ? indexers.length : 0,
    }
  },
  toPayload: prowlarrToPayload,
}
