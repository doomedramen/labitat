import type { ServiceDefinition } from "./types"
import { StatGrid } from "./widgets"

type BazarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  wantedMovies: number
  wantedEpisodes: number
}

function BazarrWidget({ wantedMovies, wantedEpisodes }: BazarrData) {
  const items = [
    { value: (wantedMovies ?? 0).toLocaleString(), label: "Movies Missing" },
    {
      value: (wantedEpisodes ?? 0).toLocaleString(),
      label: "Episodes Missing",
    },
  ]

  return <StatGrid items={items} />
}

export const bazarrDefinition: ServiceDefinition<BazarrData> = {
  id: "bazarr",
  name: "Bazarr",
  icon: "bazarr",
  category: "downloads",
  defaultPollingMs: 30_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://bazarr.example.org",
      helperText: "The base URL of your Bazarr instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Bazarr password or API key",
      helperText: "Found in Settings → General → Security",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = { "X-Api-Key": config.apiKey }

    const [wantedMoviesRes, wantedEpisodesRes] = await Promise.all([
      fetch(`${baseUrl}/api/movies/wanted?start=0&length=0`, { headers }),
      fetch(`${baseUrl}/api/episodes/wanted?start=0&length=0`, { headers }),
    ])

    if (!wantedMoviesRes.ok) {
      if (wantedMoviesRes.status === 401) throw new Error("Invalid API key")
      if (wantedMoviesRes.status === 404)
        throw new Error("Bazarr not found at this URL")
      throw new Error(`Bazarr error: ${wantedMoviesRes.status}`)
    }

    const wantedMoviesData = await wantedMoviesRes.json()
    const wantedEpisodesData = await wantedEpisodesRes.json()

    return {
      _status: "ok" as const,
      wantedMovies: wantedMoviesData.total ?? 0,
      wantedEpisodes: wantedEpisodesData.total ?? 0,
    }
  },

  Widget: BazarrWidget,
}
