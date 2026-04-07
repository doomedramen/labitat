import type { ServiceDefinition } from "./types"
import { StatGrid } from "./widgets"

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

  return <StatGrid items={items} />
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
      placeholder: "https://readarr.example.org",
      helperText: "The base URL of your Readarr instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Readarr password or API key",
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
    const wantedData = wantedRes.ok
      ? await wantedRes.json()
      : { totalRecords: 0 }
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
