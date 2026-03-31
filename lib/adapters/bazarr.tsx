import type { ServiceDefinition } from "./types"

type BazarrData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  movies: number
  episodes: number
  wantedMovies: number
  wantedEpisodes: number
}

function BazarrWidget({
  movies,
  episodes,
  wantedMovies,
  wantedEpisodes,
}: BazarrData) {
  const items = [
    { value: movies, label: "Movies" },
    { value: episodes, label: "Episodes" },
    { value: wantedMovies, label: "Movies Missing" },
    { value: wantedEpisodes, label: "Episodes Missing" },
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
      placeholder: "https://bazarr.home.lab",
      helperText: "The base URL of your Bazarr instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Bazarr API key",
      helperText: "Found in Settings → General → Security",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = { "X-Api-Key": config.apiKey }

    const [moviesRes, episodesRes, wantedMoviesRes, wantedEpisodesRes] =
      await Promise.all([
        fetch(`${baseUrl}/api/movies?start=0&length=0`, { headers }),
        fetch(`${baseUrl}/api/episodes?start=0&length=0`, { headers }),
        fetch(`${baseUrl}/api/movies/wanted?start=0&length=0`, { headers }),
        fetch(`${baseUrl}/api/episodes/wanted?start=0&length=0`, { headers }),
      ])

    if (!moviesRes.ok) {
      if (moviesRes.status === 401) throw new Error("Invalid API key")
      if (moviesRes.status === 404)
        throw new Error("Bazarr not found at this URL")
      throw new Error(`Bazarr error: ${moviesRes.status}`)
    }

    const moviesData = await moviesRes.json()
    const episodesData = await episodesRes.json()
    const wantedMoviesData = await wantedMoviesRes.json()
    const wantedEpisodesData = await wantedEpisodesRes.json()

    return {
      _status: "ok" as const,
      movies: moviesData.total ?? 0,
      episodes: episodesData.total ?? 0,
      wantedMovies: wantedMoviesData.total ?? 0,
      wantedEpisodes: wantedEpisodesData.total ?? 0,
    }
  },

  Widget: BazarrWidget,
}
