import type { ServiceDefinition } from "./types"
import { StatGrid } from "@/components/widgets"

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
        { value: missingMovies, label: "Missing Movies" },
        { value: missingEpisodes, label: "Missing Episodes" },
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

    const [moviesRes, episodesRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/badges?urlType=missingMovies`, { headers }),
      fetch(`${baseUrl}/api/v1/badges?urlType=missingEpisodes`, { headers }),
    ])

    // Bazarr uses different API structure - get counts from system/status
    const [systemRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/system/status`, { headers }),
    ])

    if (!systemRes.ok) throw new Error(`Bazarr error: ${systemRes.status}`)

    // Fetch actual missing counts
    const [missingMoviesRes, missingEpisodesRes] = await Promise.all([
      fetch(`${baseUrl}/api/v1/movies?pageSize=1`, { headers }),
      fetch(`${baseUrl}/api/v1/episodes?pageSize=1`, { headers }),
    ])

    const missingMovies = await missingMoviesRes.json()
    const missingEpisodes = await missingEpisodesRes.json()

    return {
      _status: "ok",
      missingMovies: missingMovies.total ?? 0,
      missingEpisodes: missingEpisodes.total ?? 0,
    }
  },
  Widget: BazarrWidget,
}
