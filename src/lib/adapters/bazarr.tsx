import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"
import { Film, Tv } from "lucide-react"

type BazarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  missingMovies: number
  missingEpisodes: number
}

function BazarrWidget({ missingMovies, missingEpisodes }: BazarrData) {
  return (
    <StatGrid
      items={[
        {
          value: missingMovies,
          label: "Missing Movies",
          icon: <Film className="h-3 w-3" />,
          tooltip: "Missing Movies",
        },
        {
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
      missingMovies: data.wanted_movies ?? 0,
      missingEpisodes: data.wanted_episodes ?? 0,
    }
  },
  Widget: BazarrWidget,
}
