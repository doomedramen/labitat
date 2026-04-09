import type { ServiceDefinition } from "./types"
import { Thermometer, Droplets, Wind, Sun, Moon } from "lucide-react"

type OpenMeteoData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  temperature: number
  humidity: number
  windSpeed: number
  weatherCode: number
  isDay: boolean
}

// WMO weather code descriptions
const weatherDescriptions: Record<number, string> = {
  0: "Clear sky",
  1: "Mainly clear",
  2: "Partly cloudy",
  3: "Overcast",
  45: "Foggy",
  48: "Depositing rime fog",
  51: "Light drizzle",
  53: "Moderate drizzle",
  55: "Dense drizzle",
  61: "Slight rain",
  63: "Moderate rain",
  65: "Heavy rain",
  71: "Slight snow",
  73: "Moderate snow",
  75: "Heavy snow",
  80: "Slight showers",
  81: "Moderate showers",
  82: "Violent showers",
  95: "Thunderstorm",
}

function openmeteoToPayload(data: OpenMeteoData) {
  const weatherDesc = weatherDescriptions[data.weatherCode] ?? "Unknown"

  return {
    stats: [
      {
        id: "temp",
        value: `${data.temperature}°C`,
        label: "Temp",
        icon: Thermometer,
      },
      {
        id: "humidity",
        value: `${data.humidity}%`,
        label: "Humidity",
        icon: Droplets,
      },
      {
        id: "wind",
        value: `${data.windSpeed} km/h`,
        label: "Wind",
        icon: Wind,
      },
      {
        id: "daynight",
        value: data.isDay ? "☀️" : "🌙",
        label: weatherDesc,
        icon: data.isDay ? Sun : Moon,
      },
    ],
  }
}

export const openmeteoDefinition: ServiceDefinition<OpenMeteoData> = {
  id: "openmeteo",
  name: "Open-Meteo Weather",
  icon: "openmeteo",
  category: "info",
  defaultPollingMs: 30_000,
  configFields: [
    {
      key: "latitude",
      label: "Latitude",
      type: "number",
      required: true,
      placeholder: "51.5074",
      helperText: "Your location's latitude",
    },
    {
      key: "longitude",
      label: "Longitude",
      type: "number",
      required: true,
      placeholder: "-0.1278",
      helperText: "Your location's longitude",
    },
  ],
  async fetchData(config) {
    const lat = config.latitude
    const lon = config.longitude
    const url = `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}&current=temperature_2m,relative_humidity_2m,weather_code,wind_speed_10m,is_day&temperature_unit=celsius&wind_speed_unit=kmh`

    const res = await fetch(url)
    if (!res.ok) throw new Error(`Open-Meteo error: ${res.status}`)

    const data = await res.json()
    const current = data.current ?? {}

    return {
      _status: "ok",
      temperature: Math.round(current.temperature_2m ?? 0),
      humidity: Math.round(current.relative_humidity_2m ?? 0),
      windSpeed: Math.round(current.wind_speed_10m ?? 0),
      weatherCode: current.weather_code ?? 0,
      isDay: current.is_day === 1,
    }
  },
  toPayload: openmeteoToPayload,
}
