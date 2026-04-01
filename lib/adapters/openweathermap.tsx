import Image from "next/image"
import type { ServiceDefinition } from "./types"
import { StatGrid } from "./widgets"
import {
  Sun,
  Cloud,
  CloudRain,
  CloudSnow,
  CloudLightning,
  CloudFog,
  Wind,
  Droplets,
  Thermometer,
  Gauge,
  Cloudy,
} from "lucide-react"

type OpenWeatherMapData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  temperature: number
  feelsLike: number
  weatherDescription: string
  weatherIcon: string
  weatherMain?: string
  humidity: number
  pressure: number
  windSpeed: number
  cloudiness: number
}

function getWeatherIcon(main?: string, icon?: string, description?: string) {
  const iconClass = "size-12 text-foreground"
  const mainLower = main?.toLowerCase() || ""

  // Use OpenWeatherMap's main weather type
  switch (mainLower) {
    case "clear":
      return <Sun className={iconClass} />
    case "clouds":
      return <Cloud className={iconClass} />
    case "rain":
    case "drizzle":
      return <CloudRain className={iconClass} />
    case "snow":
      return <CloudSnow className={iconClass} />
    case "thunderstorm":
      return <CloudLightning className={iconClass} />
    case "mist":
    case "fog":
    case "haze":
    case "smoke":
    case "dust":
      return <CloudFog className={iconClass} />
    default:
      // Fallback to OpenWeatherMap icon if available
      if (icon) {
        return (
          <img
            src={`https://openweathermap.org/img/wn/${icon}@2x.png`}
            alt={description || "Weather"}
            className="size-12"
          />
        )
      }
      return <Thermometer className={iconClass} />
  }
}

function OpenWeatherMapWidget({
  temperature,
  feelsLike,
  weatherDescription,
  weatherIcon,
  weatherMain,
  humidity,
  pressure,
  windSpeed,
  cloudiness,
}: OpenWeatherMapData) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        {getWeatherIcon(weatherMain, weatherIcon, weatherDescription)}
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

      <StatGrid
        cols={4}
        items={[
          {
            icon: <Droplets className="size-3 text-muted-foreground" />,
            value: `${humidity}%`,
            label: "Humidity",
          },
          {
            icon: <Gauge className="size-3 text-muted-foreground" />,
            value: pressure,
            label: "hPa",
          },
          {
            icon: <Wind className="size-3 text-muted-foreground" />,
            value: `${windSpeed.toFixed(1)}`,
            label: "m/s",
          },
          {
            icon: <Cloudy className="size-3 text-muted-foreground" />,
            value: `${cloudiness}%`,
            label: "Clouds",
          },
        ]}
      />
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
      weatherMain: weather?.main,
      humidity: main?.humidity ?? 0,
      pressure: main?.pressure ?? 0,
      windSpeed: data.wind?.speed ?? 0,
      cloudiness: data.clouds?.all ?? 0,
    }
  },

  Widget: OpenWeatherMapWidget,
}
