import type { ServiceDefinition } from "./types"
import { StatGrid } from "./widgets"

type CalibreWebData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  books: number
  authors: number
  categories: number
  series: number
}

function CalibreWebWidget({
  books,
  authors,
  categories,
  series,
}: CalibreWebData) {
  const items = [
    { value: (books ?? 0).toLocaleString(), label: "Books" },
    { value: (authors ?? 0).toLocaleString(), label: "Authors" },
    { value: (categories ?? 0).toLocaleString(), label: "Categories" },
    { value: (series ?? 0).toLocaleString(), label: "Series" },
  ]

  return <StatGrid items={items} />
}

export const calibreWebDefinition: ServiceDefinition<CalibreWebData> = {
  id: "calibre-web",
  name: "Calibre-Web",
  icon: "calibre-web",
  category: "media",
  defaultPollingMs: 60_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://calibre-web.example.org",
      helperText: "Calibre-Web URL",
    },
  ],

  async fetchData(config) {
    const { url } = config

    if (!url) {
      throw new Error("URL is required")
    }

    const baseUrl = url.replace(/\/$/, "")

    // Fetch stats from the OPDS endpoint
    const statsRes = await fetch(`${baseUrl}/opds/stats`)

    if (!statsRes.ok) {
      throw new Error(`Failed to fetch stats: ${statsRes.status}`)
    }

    const data = await statsRes.json()

    return {
      _status: "ok" as const,
      books: data.books ?? 0,
      authors: data.authors ?? 0,
      categories: data.categories ?? 0,
      series: data.series ?? 0,
    }
  },

  Widget: CalibreWebWidget,
}
