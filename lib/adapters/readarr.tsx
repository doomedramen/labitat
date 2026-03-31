import type { ServiceDefinition } from "./types"

type ReadarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  queued: number
  wanted: number
  books: number
}

function ReadarrWidget({ queued, wanted, books }: ReadarrData) {
  const items = [
    { value: wanted, label: "Wanted" },
    { value: queued, label: "Queued" },
    { value: books, label: "Books" },
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

export const readarrDefinition: ServiceDefinition<ReadarrData> = {
  id: "readarr",
  name: "Readarr",
  icon: "readarr",
  category: "downloads",
  defaultPollingMs: 10_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://readarr.home.lab",
      helperText: "The base URL of your Readarr instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Readarr API key",
      helperText: "Found in Settings → General → Security",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = { "X-Api-Key": config.apiKey }

    const [booksRes, wantedRes, queueRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/book`, { headers }),
      fetch(`${baseUrl}/api/v1/wanted/missing`, { headers }),
      fetch(`${baseUrl}/api/v1/queue/status`, { headers }),
    ])

    if (!booksRes.ok) {
      if (booksRes.status === 401) throw new Error("Invalid API key")
      if (booksRes.status === 404)
        throw new Error("Readarr not found at this URL")
      throw new Error(`Readarr error: ${booksRes.status}`)
    }

    const booksData = await booksRes.json()
    const wantedData = wantedRes.ok ? await wantedRes.json() : { totalRecords: 0 }
    const queueData = queueRes.ok ? await queueRes.json() : { totalCount: 0 }

    return {
      _status: "ok" as const,
      queued: queueData.totalCount ?? 0,
      wanted: wantedData.totalRecords ?? 0,
      books: booksData.have ?? 0,
    }
  },

  Widget: ReadarrWidget,
}
