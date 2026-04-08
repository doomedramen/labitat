import type { ServiceDefinition } from "./types"

type SearchData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  engines: string
}

function SearchWidget({ engines }: SearchData) {
  const engineList = engines.split(",").map((e) => e.trim())

  return (
    <div className="flex flex-wrap items-center justify-center gap-2 py-2">
      {engineList.map((engine) => (
        <a
          key={engine}
          href={`https://www.google.com/search?q=${engine}`}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded-md bg-secondary px-2 py-1 text-xs text-secondary-foreground hover:bg-secondary/80"
        >
          {engine}
        </a>
      ))}
    </div>
  )
}

export const searchDefinition: ServiceDefinition<SearchData> = {
  id: "search",
  name: "Search",
  icon: "search",
  category: "info",
  configFields: [
    {
      key: "engines",
      label: "Search Engines",
      type: "text",
      required: false,
      placeholder: "Google, DuckDuckGo, Bing",
      helperText: "Comma-separated list of search engine names",
    },
  ],
  fetchData(config) {
    return Promise.resolve({
      _status: "ok",
      engines: config.engines || "Google,DuckDuckGo,Bing",
    })
  },
  Widget: SearchWidget,
}
