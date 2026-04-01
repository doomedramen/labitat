import type { ServiceDefinition } from "./types"

type OpenWeatherMapData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  temperature: number
  feelsLike: number
  weatherDescription: string
  weatherIcon: string
  humidity: number
  pressure: number
  windSpeed: number
  cloudiness: number
}

function OpenWeatherMapWidget({
  temperature,
  feelsLike,
  weatherDescription,
  weatherIcon,
  humidity,
  pressure,
  windSpeed,
  cloudiness,
}: OpenWeatherMapData) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {weatherIcon && (
          <img
            src={`https://openweathermap.org/img/wn/${weatherIcon}@2x.png`}
            alt={weatherDescription}
            className="size-12"
          />
        )}
        <div className="flex flex-col">
          <div className="text-3xl font-bold text-foreground tabular-nums">
            {temperature.toFixed(1)}°C
          </div>
          <div className="text-xs text-muted-foreground">
            Feels like {feelsLike.toFixed(1)}°C
          </div>
        </div>
      </div>

      <div className="text-xs font-medium text-foreground">
        {weatherDescription}
      </div>

      <div className="grid grid-cols-4 gap-2 text-xs">
        <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1 text-center">
          <span className="font-medium text-foreground tabular-nums">
            {humidity}%
          </span>
          <span className="text-muted-foreground">Humidity</span>
        </div>
        <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1 text-center">
          <span className="font-medium text-foreground tabular-nums">
            {pressure}
          </span>
          <span className="text-muted-foreground">hPa</span>
        </div>
        <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1 text-center">
          <span className="font-medium text-foreground tabular-nums">
            {windSpeed.toFixed(1)}
          </span>
          <span className="text-muted-foreground">m/s</span>
        </div>
        <div className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1 text-center">
          <span className="font-medium text-foreground tabular-nums">
            {cloudiness}%
          </span>
          <span className="text-muted-foreground">Clouds</span>
        </div>
      </div>
    </div>
  )
}

export const openweathermapDefinition: ServiceDefinition<OpenWeatherMapData> = {
  id: "openweathermap",
  name: "OpenWeatherMap",
  icon: "openweathermap",
  category: "info",
  defaultPollingMs: 60_000,

  configFields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your OpenWeatherMap API key",
      helperText: "Get a free API key at openweathermap.org/api",
    },
    {
      key: "latitude",
      label: "Latitude",
      type: "number",
      required: true,
      placeholder: "52.52",
      helperText: "Latitude coordinate (e.g., 52.52 for Berlin)",
    },
    {
      key: "longitude",
      label: "Longitude",
      type: "number",
      required: true,
      placeholder: "13.41",
      helperText: "Longitude coordinate (e.g., 13.41 for Berlin)",
    },
    {
      key: "units",
      label: "Units",
      type: "select",
      required: false,
      options: [
        { label: "Metric (°C)", value: "metric" },
        { label: "Imperial (°F)", value: "imperial" },
        { label: "Kelvin (K)", value: "standard" },
      ],
      helperText: "Temperature units",
    },
  ],

  async fetchData(config) {
    const { apiKey, latitude, longitude, units = "metric" } = config

    if (!apiKey) {
      throw new Error("API key is required")
    }

    if (!latitude || !longitude) {
      throw new Error("Latitude and longitude are required")
    }

    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${latitude}&lon=${longitude}&appid=${apiKey}&units=${units}`

    const res = await fetch(url)

    if (!res.ok) {
      if (res.status === 401) throw new Error("Invalid API key")
      if (res.status === 404) throw new Error("Location not found")
      throw new Error(`OpenWeatherMap error: ${res.status}`)
    }

    const data = await res.json()

    const weather = data.weather?.[0]
    const main = data.main

    return {
      _status: "ok" as const,
      temperature: main?.temp ?? 0,
      feelsLike: main?.feels_like ?? 0,
      weatherDescription: weather?.description ?? "Unknown",
      weatherIcon: weather?.icon ?? "",
      humidity: main?.humidity ?? 0,
      pressure: main?.pressure ?? 0,
      windSpeed: data.wind?.speed ?? 0,
      cloudiness: data.clouds?.all ?? 0,
    }
  },

  Widget: OpenWeatherMapWidget,
}
