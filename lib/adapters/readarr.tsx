import type { ServiceDefinition } from "./types"

type ReadarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  queued: number
  missing: number
  authors: number
  books: number
}

function ReadarrWidget({ queued, missing, authors, books }: ReadarrData) {
  const items = [
    { value: queued, label: "Queued" },
    { value: missing, label: "Missing" },
    { value: authors, label: "Authors" },
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

    const [authorsRes, booksRes, queueRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/author`, { headers }),
      fetch(`${baseUrl}/api/v1/book`, { headers }),
      fetch(`${baseUrl}/api/v1/queue/status`, { headers }),
    ])

    if (!authorsRes.ok) {
      if (authorsRes.status === 401) throw new Error("Invalid API key")
      if (authorsRes.status === 404)
        throw new Error("Readarr not found at this URL")
      throw new Error(`Readarr error: ${authorsRes.status}`)
    }

    const authorsData = await authorsRes.json()
    const booksData = await booksRes.json()
    const queueData = queueRes.ok ? await queueRes.json() : { totalCount: 0 }

    // Calculate missing books (monitored but not downloaded)
    let missing = 0
    for (const book of booksData) {
      if (book.monitored && !book.grabbed) {
        missing++
      }
    }

    return {
      _status: "ok" as const,
      queued: queueData.totalCount ?? 0,
      missing,
      authors: authorsData.length,
      books: booksData.length,
    }
  },

  Widget: ReadarrWidget,
}
