import type { ServiceDefinition } from "./types"
import { WidgetStatGrid } from "@/components/dashboard/item/widget-stat-grid"
import { Film, Tv } from "lucide-react"

type BazarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  missingMovies: number
  missingEpisodes: number
}

function BazarrWidget({ missingMovies, missingEpisodes }: BazarrData) {
  return (
    <WidgetStatGrid
      items={[
        {
          id: "missing-movies",
          value: missingMovies,
          label: "Missing Movies",
          icon: <Film className="h-3 w-3" />,
          tooltip: "Missing Movies",
        },
        {
          id: "missing-episodes",
          value: missingEpisodes,
          label: "Missing Episodes",
          icon: <Tv className="h-3 w-3" />,
          tooltip: "Missing Episodes",
        },
      ]}
    />
  )
}

export const bazarrDefinition: ServiceDefinition<BazarrData> = {
  id: "bazarr",
  name: "Bazarr",
  icon: "bazarr",
  category: "downloads",
  defaultPollingMs: 15_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://bazarr.example.org",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Bazarr API key",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = { "X-Api-Key": config.apiKey }

    const res = await fetch(`${baseUrl}/api/badges`, { headers })

    if (!res.ok) throw new Error(`Bazarr error: ${res.status}`)

    const data = await res.json()

    return {
      _status: "ok",
      missingMovies: data.movies ?? 0,
      missingEpisodes: data.episodes ?? 0,
    }
  },
  Widget: BazarrWidget,
}
