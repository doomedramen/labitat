import type { ServiceDefinition } from "./types"

type ProwlarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  grabs: number
  queries: number
  failedGrabs: number
  failedQueries: number
}

function ProwlarrWidget({
  grabs,
  queries,
  failedGrabs,
  failedQueries,
}: ProwlarrData) {
  const items = [
    { value: (grabs ?? 0).toLocaleString(), label: "Grabs" },
    { value: (queries ?? 0).toLocaleString(), label: "Queries" },
    { value: failedGrabs ?? 0, label: "Fail Grabs" },
    { value: failedQueries ?? 0, label: "Fail Queries" },
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

export const prowlarrDefinition: ServiceDefinition<ProwlarrData> = {
  id: "prowlarr",
  name: "Prowlarr",
  icon: "prowlarr",
  category: "downloads",
  defaultPollingMs: 30_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://prowlarr.home.lab",
      helperText: "The base URL of your Prowlarr instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Prowlarr API key",
      helperText: "Found in Settings → General → Security",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = { "X-Api-Key": config.apiKey }

    const statsRes = await fetch(`${baseUrl}/api/v1/indexerstats`, { headers })

    if (!statsRes.ok) {
      if (statsRes.status === 401) throw new Error("Invalid API key")
      if (statsRes.status === 404)
        throw new Error("Prowlarr not found at this URL")
      throw new Error(`Prowlarr error: ${statsRes.status}`)
    }

    const statsData = await statsRes.json()

    // Aggregate stats from all indexers
    let grabs = 0
    let queries = 0
    let failedGrabs = 0
    let failedQueries = 0

    if (statsData.indexers) {
      for (const indexer of statsData.indexers) {
        grabs += indexer.numberOfGrabs ?? 0
        queries += indexer.numberOfQueries ?? 0
        failedGrabs += indexer.numberOfFailedGrabs ?? 0
        failedQueries += indexer.numberOfFailedQueries ?? 0
      }
    }

    return {
      _status: "ok" as const,
      grabs,
      queries,
      failedGrabs,
      failedQueries,
    }
  },

  Widget: ProwlarrWidget,
}
