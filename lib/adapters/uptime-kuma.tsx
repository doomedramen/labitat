import type { ServiceDefinition } from "./types"

type UptimeKumaData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  upCount: number
  downCount: number
  pausedCount: number
  totalCount: number
}

function UptimeKumaWidget({
  upCount,
  downCount,
  pausedCount,
  totalCount,
}: UptimeKumaData) {
  const items = [
    { value: upCount, label: "Up" },
    { value: downCount, label: "Down" },
    { value: pausedCount, label: "Paused" },
    { value: totalCount, label: "Total" },
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

export const uptimeKumaDefinition: ServiceDefinition<UptimeKumaData> = {
  id: "uptime-kuma",
  name: "Uptime Kuma",
  icon: "uptime-kuma",
  category: "monitoring",
  defaultPollingMs: 15_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://uptime.home.lab",
      helperText: "The base URL of your Uptime Kuma instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Uptime Kuma API key",
      helperText: "Found in Settings → API Keys",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")

    // Uptime Kuma uses GraphQL API
    const query = `
      query {
        monitors {
          id
          active
          status
        }
      }
    `

    const res = await fetch(`${baseUrl}/graphql`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${config.apiKey}`,
      },
      body: JSON.stringify({ query }),
    })

    if (!res.ok) {
      if (res.status === 401) throw new Error("Invalid API key")
      if (res.status === 404)
        throw new Error("Uptime Kuma not found at this URL")
      throw new Error(`Uptime Kuma error: ${res.status}`)
    }

    const data = await res.json()
    const monitors = data.data?.monitors ?? []

    const upCount = monitors.filter(
      (m: { status: number }) => m.status === 1
    ).length
    const downCount = monitors.filter(
      (m: { status: number }) => m.status === 0
    ).length
    const pausedCount = monitors.filter(
      (m: { active: boolean }) => !m.active
    ).length

    return {
      _status: "ok" as const,
      upCount,
      downCount,
      pausedCount,
      totalCount: monitors.length,
    }
  },

  Widget: UptimeKumaWidget,
}
