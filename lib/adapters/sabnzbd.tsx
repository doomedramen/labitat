import type { ServiceDefinition } from "./types"

type SabnzbdData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  queue: number
  speed: string
  timeleft: string
}

function SabnzbdWidget({ queue, speed, timeleft }: SabnzbdData) {
  const items = [
    { value: speed, label: "Speed" },
    { value: queue, label: "Queue" },
    { value: timeleft, label: "Time Left" },
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

export const sabnzbdDefinition: ServiceDefinition<SabnzbdData> = {
  id: "sabnzbd",
  name: "SABnzbd",
  icon: "sabnzbd",
  category: "downloads",
  defaultPollingMs: 5_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://sabnzbd.home.lab",
      helperText: "The base URL of your SABnzbd instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your SABnzbd API key",
      helperText: "Found in Config → General → API Key",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const url = `${baseUrl}/api?mode=queue&output=json&apikey=${config.apiKey}`

    const res = await fetch(url)

    if (!res.ok) {
      if (res.status === 401) throw new Error("Invalid API key")
      if (res.status === 404) throw new Error("SABnzbd not found at this URL")
      throw new Error(`SABnzbd error: ${res.status}`)
    }

    const data = await res.json()

    if (data.error) {
      throw new Error(data.error)
    }

    const queue = data.queue ?? {}

    return {
      _status: "ok" as const,
      queue: queue.noofslots ?? 0,
      speed: queue.speed ?? "0 B/s",
      timeleft: queue.timeleft ?? "0:00:00",
    }
  },

  Widget: SabnzbdWidget,
}
