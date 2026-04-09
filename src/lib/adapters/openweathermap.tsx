import type { ServiceDefinition } from "./types"
import {
  Thermometer,
  Droplets,
  Wind,
  Cloud,
  ThermometerSun,
} from "lucide-react"

type OpenWeatherMapData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  temperature: number
  humidity: number
  windSpeed: number
  description: string
  feelsLike: number
  unitSymbol: string
  speedUnit: string
}

function openweathermapToPayload(data: OpenWeatherMapData) {
  return {
    stats: [
      {
        id: "temp",
        value: `${data.temperature}${data.unitSymbol}`,
        label: "Temp",
        icon: Thermometer,
      },
      {
        id: "feels-like",
        value: `${data.feelsLike}${data.unitSymbol}`,
        label: "Feels Like",
        icon: ThermometerSun,
      },
      {
        id: "humidity",
        value: `${data.humidity}%`,
        label: "Humidity",
        icon: Droplets,
      },
      {
        id: "wind",
        value: `${data.windSpeed} ${data.speedUnit}`,
        label: "Wind",
        icon: Wind,
      },
      {
        id: "condition",
        value: data.description,
        label: "Condition",
        icon: Cloud,
      },
    ],
  }
}

export const openweathermapDefinition: ServiceDefinition<OpenWeatherMapData> = {
  id: "openweathermap",
  name: "OpenWeatherMap",
  icon: "openweather",
  category: "info",
  defaultPollingMs: 30_000,
  configFields: [
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your OpenWeatherMap API key",
    },
    {
      key: "latitude",
      label: "Latitude",
      type: "number",
      required: true,
      placeholder: "51.5074",
    },
    {
      key: "longitude",
      label: "Longitude",
      type: "number",
      required: true,
      placeholder: "-0.1278",
    },
    {
      key: "units",
      label: "Units",
      type: "select",
      options: [
        { label: "Celsius", value: "metric" },
        { label: "Fahrenheit", value: "imperial" },
      ],
      helperText: "Temperature units",
    },
  ],
  async fetchData(config) {
    const units = config.units || "metric"
    const unitSymbol = units === "imperial" ? "°F" : "°C"
    const speedUnit = units === "imperial" ? "mph" : "m/s"
    const url = `https://api.openweathermap.org/data/2.5/weather?lat=${config.latitude}&lon=${config.longitude}&appid=${config.apiKey}&units=${units}`

    const res = await fetch(url)
    if (!res.ok) throw new Error(`OpenWeatherMap error: ${res.status}`)

    const data = await res.json()

    return {
      _status: "ok",
      temperature: Math.round(data.main?.temp ?? 0),
      humidity: Math.round(data.main?.humidity ?? 0),
      windSpeed: Math.round(data.wind?.speed ?? 0),
      description: data.weather?.[0]?.description ?? "Unknown",
      feelsLike: Math.round(data.main?.feels_like ?? 0),
      unitSymbol,
      speedUnit,
    }
  },
  toPayload: openweathermapToPayload,
}
