import { fetchWeatherApi } from "openmeteo"
import type { ServiceDefinition } from "./types"

type OpenMeteoData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  temperature: number
  weatherCode: number
  weatherDescription: string
  windSpeed: number
  humidity: number
  isDay: 0 | 1
}

function getWeatherDescription(code: number, isDay: 0 | 1): string {
  const weatherCodes: Record<number, { day: string; night: string }> = {
    0: { day: "Clear sky", night: "Clear sky" },
    1: { day: "Mainly clear", night: "Mainly clear" },
    2: { day: "Partly cloudy", night: "Partly cloudy" },
    3: { day: "Overcast", night: "Overcast" },
    45: { day: "Foggy", night: "Foggy" },
    48: { day: "Depositing rime fog", night: "Depositing rime fog" },
    51: { day: "Light drizzle", night: "Light drizzle" },
    53: { day: "Moderate drizzle", night: "Moderate drizzle" },
    55: { day: "Dense drizzle", night: "Dense drizzle" },
    56: { day: "Light freezing drizzle", night: "Light freezing drizzle" },
    57: { day: "Dense freezing drizzle", night: "Dense freezing drizzle" },
    61: { day: "Slight rain", night: "Slight rain" },
    63: { day: "Moderate rain", night: "Moderate rain" },
    65: { day: "Heavy rain", night: "Heavy rain" },
    66: { day: "Light freezing rain", night: "Light freezing rain" },
    67: { day: "Heavy freezing rain", night: "Heavy freezing rain" },
    71: { day: "Slight snow fall", night: "Slight snow fall" },
    73: { day: "Moderate snow fall", night: "Moderate snow fall" },
    75: { day: "Heavy snow fall", night: "Heavy snow fall" },
    77: { day: "Snow grains", night: "Snow grains" },
    80: { day: "Slight rain showers", night: "Slight rain showers" },
    81: { day: "Moderate rain showers", night: "Moderate rain showers" },
    82: { day: "Violent rain showers", night: "Violent rain showers" },
    85: { day: "Slight snow showers", night: "Slight snow showers" },
    86: { day: "Heavy snow showers", night: "Heavy snow showers" },
    95: { day: "Thunderstorm", night: "Thunderstorm" },
    96: {
      day: "Thunderstorm with slight hail",
      night: "Thunderstorm with slight hail",
    },
    99: {
      day: "Thunderstorm with heavy hail",
      night: "Thunderstorm with heavy hail",
    },
  }

  const weather = weatherCodes[code]
  if (!weather) return "Unknown"
  return isDay === 1 ? weather.day : weather.night
}

function OpenMeteoWidget({
  temperature,
  weatherDescription,
  windSpeed,
  humidity,
}: OpenMeteoData) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-3">
        <div className="text-3xl font-bold text-foreground tabular-nums">
          {temperature.toFixed(1)}°C
        </div>
        <div className="flex flex-col text-xs">
          <span className="font-medium text-foreground">
            {weatherDescription}
          </span>
          <span className="text-muted-foreground">
            Wind: {windSpeed.toFixed(1)} km/h • Humidity: {humidity}%
          </span>
        </div>
      </div>
    </div>
  )
}

export const openmeteoDefinition: ServiceDefinition<OpenMeteoData> = {
  id: "openmeteo",
  name: "OpenMeteo Weather",
  icon: "weather",
  category: "info",
  defaultPollingMs: 60_000,

  configFields: [
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
  ],

  async fetchData(config) {
    const { latitude, longitude } = config

    if (!latitude || !longitude) {
      throw new Error("Latitude and longitude are required")
    }

    const params = {
      latitude: [parseFloat(latitude)],
      longitude: [parseFloat(longitude)],
      current:
        "temperature_2m,weather_code,wind_speed_10m,relative_humidity_2m,is_day",
    }

    const url = "https://api.open-meteo.com/v1/forecast"

    try {
      const responses = await fetchWeatherApi(url, params)
      const response = responses[0]

      const current = response.current()!
      const temperature = current.variables(0)!.value()
      const weatherCode = current.variables(1)!.value()
      const windSpeed = current.variables(2)!.value()
      const humidity = current.variables(3)!.value()
      const isDay = current.variables(4)!.value() as 0 | 1

      return {
        _status: "ok" as const,
        temperature,
        weatherCode,
        weatherDescription: getWeatherDescription(weatherCode, isDay),
        windSpeed,
        humidity,
        isDay,
      }
    } catch (err) {
      if (err instanceof Error) {
        throw new Error(`OpenMeteo error: ${err.message}`)
      }
      throw new Error("OpenMeteo error: Failed to fetch weather data")
    }
  },

  Widget: OpenMeteoWidget,
}
