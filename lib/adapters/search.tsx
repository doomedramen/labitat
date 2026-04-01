import type { ServiceDefinition } from "./types"

type SearchData = {
  _status?: "ok" | "warn" | "error" | "none"
  _statusText?: string
  searchEngine: string
  searchUrl: string
  placeholder: string
}

const searchEngines: Record<string, { url: string; placeholder: string }> = {
  google: {
    url: "https://www.google.com/search?q=",
    placeholder: "Search Google...",
  },
  duckduckgo: {
    url: "https://duckduckgo.com/?q=",
    placeholder: "Search DuckDuckGo...",
  },
  bing: {
    url: "https://www.bing.com/search?q=",
    placeholder: "Search Bing...",
  },
  brave: {
    url: "https://search.brave.com/search?q=",
    placeholder: "Search Brave...",
  },
  startpage: {
    url: "https://www.startpage.com/sp/search?query=",
    placeholder: "Search Startpage...",
  },
  qwant: {
    url: "https://www.qwant.com/?q=",
    placeholder: "Search Qwant...",
  },
  wikipedia: {
    url: "https://en.wikipedia.org/w/index.php?search=",
    placeholder: "Search Wikipedia...",
  },
  youtube: {
    url: "https://www.youtube.com/results?search_query=",
    placeholder: "Search YouTube...",
  },
}

function SearchWidget({ searchEngine, searchUrl, placeholder }: SearchData) {
  const handleSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault()
    const form = e.currentTarget
    const input = form.elements.namedItem("search") as HTMLInputElement
    const query = encodeURIComponent(input.value)
    if (query) {
      window.open(`${searchUrl}${query}`, "_blank", "noopener,noreferrer")
      input.value = ""
    }
  }

  return (
    <form onSubmit={handleSubmit} className="py-1">
      <div className="flex gap-1">
        <input
          type="text"
          name="search"
          placeholder={placeholder}
          className="flex-1 rounded-md border border-input bg-background px-2 py-1.5 text-xs outline-none focus:border-ring focus:ring-1 focus:ring-ring"
          autoComplete="off"
        />
        <button
          type="submit"
          className="rounded-md bg-primary px-3 py-1.5 text-xs font-medium text-primary-foreground transition-colors hover:bg-primary/90"
        >
          Search
        </button>
      </div>
    </form>
  )
}

export const searchDefinition: ServiceDefinition<SearchData> = {
  id: "search",
  name: "Search",
  icon: "search",
  category: "info",
  defaultPollingMs: undefined, // No polling needed - static widget

  configFields: [
    {
      key: "searchEngine",
      label: "Search Engine",
      type: "select",
      required: true,
      options: [
        { label: "Google", value: "google" },
        { label: "DuckDuckGo", value: "duckduckgo" },
        { label: "Bing", value: "bing" },
        { label: "Brave", value: "brave" },
        { label: "Startpage", value: "startpage" },
        { label: "Qwant", value: "qwant" },
        { label: "Wikipedia", value: "wikipedia" },
        { label: "YouTube", value: "youtube" },
      ],
      helperText: "Choose your preferred search engine",
    },
  ],

  async fetchData(config) {
    const { searchEngine = "google" } = config
    const engine = searchEngines[searchEngine]

    if (!engine) {
      throw new Error(`Unknown search engine: ${searchEngine}`)
    }

    return {
      _status: "none" as const, // Static widget - no status
      searchEngine,
      searchUrl: engine.url,
      placeholder: engine.placeholder,
    }
  },

  Widget: SearchWidget,
}
