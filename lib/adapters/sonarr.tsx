import type { ServiceDefinition } from "./types"

type SonarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  wanted: number
  queued: number
  series: number
}

function SonarrWidget({ wanted, queued, series }: SonarrData) {
  const items = [
    { value: wanted, label: "Wanted" },
    { value: queued, label: "Queued" },
    { value: series, label: "Series" },
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

export const sonarrDefinition: ServiceDefinition<SonarrData> = {
  id: "sonarr",
  name: "Sonarr",
  icon: "sonarr",
  category: "downloads",
  defaultPollingMs: 10_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://sonarr.home.lab",
      helperText: "The base URL of your Sonarr instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Sonarr API key",
      helperText: "Found in Settings → General → Security",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = { "X-Api-Key": config.apiKey }

    const [wantedRes, queueRes, seriesRes] = await Promise.all([
      fetch(`${baseUrl}/api/v3/wanted/missing`, { headers }),
      fetch(`${baseUrl}/api/v3/queue`, { headers }),
      fetch(`${baseUrl}/api/v3/series`, { headers }),
    ])

    if (!wantedRes.ok) {
      if (wantedRes.status === 401) throw new Error("Invalid API key")
      if (wantedRes.status === 404)
        throw new Error("Sonarr not found at this URL")
      throw new Error(`Sonarr error: ${wantedRes.status}`)
    }

    const wantedData = await wantedRes.json()
    const queueData = queueRes.ok ? await queueRes.json() : { totalRecords: 0 }
    const seriesData = await seriesRes.json()

    return {
      _status: "ok" as const,
      wanted: wantedData.totalRecords ?? 0,
      queued: queueData.totalRecords ?? 0,
      series: seriesData.length,
    }
  },

  Widget: SonarrWidget,
}
