import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { openmeteoDefinition } from "@/lib/adapters/openmeteo"

describe("openmeteo definition", () => {
  it("has correct metadata", () => {
    expect(openmeteoDefinition.id).toBe("openmeteo")
    expect(openmeteoDefinition.name).toBe("Open-Meteo Weather")
    expect(openmeteoDefinition.icon).toBe("openmeteo")
    expect(openmeteoDefinition.category).toBe("info")
    expect(openmeteoDefinition.defaultPollingMs).toBe(30_000)
  })

  it("has configFields defined", () => {
    expect(openmeteoDefinition.configFields).toBeDefined()
    expect(openmeteoDefinition.configFields).toHaveLength(2)
    expect(openmeteoDefinition.configFields[0].key).toBe("latitude")
    expect(openmeteoDefinition.configFields[0].type).toBe("number")
    expect(openmeteoDefinition.configFields[0].required).toBe(true)
    expect(openmeteoDefinition.configFields[1].key).toBe("longitude")
    expect(openmeteoDefinition.configFields[1].type).toBe("number")
    expect(openmeteoDefinition.configFields[1].required).toBe(true)
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("fetches data successfully", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              current: {
                temperature_2m: 22.5,
                relative_humidity_2m: 65.3,
                weather_code: 2,
                wind_speed_10m: 15.7,
                is_day: 1,
              },
            }),
        })
      )

      const result = await openmeteoDefinition.fetchData!({
        latitude: "51.5074",
        longitude: "-0.1278",
      })

      expect(result._status).toBe("ok")
      expect(result.temperature).toBe(23)
      expect(result.humidity).toBe(65)
      expect(result.windSpeed).toBe(16)
      expect(result.weatherCode).toBe(2)
      expect(result.isDay).toBe(true)
    })

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 500 }))

      await expect(
        openmeteoDefinition.fetchData!({
          latitude: "51.5074",
          longitude: "-0.1278",
        })
      ).rejects.toThrow("Open-Meteo error: 500")
    })

    it("handles missing data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )

      const result = await openmeteoDefinition.fetchData!({
        latitude: "51.5074",
        longitude: "-0.1278",
      })

      expect(result.temperature).toBe(0)
      expect(result.humidity).toBe(0)
      expect(result.windSpeed).toBe(0)
      expect(result.weatherCode).toBe(0)
      expect(result.isDay).toBe(false)
    })

    it("handles is_day === 0 as night", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              current: {
                temperature_2m: 10,
                relative_humidity_2m: 80,
                weather_code: 0,
                wind_speed_10m: 5,
                is_day: 0,
              },
            }),
        })
      )

      const result = await openmeteoDefinition.fetchData!({
        latitude: "51.5074",
        longitude: "-0.1278",
      })

      expect(result.isDay).toBe(false)
    })
  })

  describe("Widget", () => {
    it("renders with sample data (daytime)", () => {
      render(
        <openmeteoDefinition.Widget
          temperature={23}
          humidity={65}
          windSpeed={16}
          weatherCode={2}
          isDay={true}
        />
      )
      expect(screen.getByText("23°C")).toBeInTheDocument()
      expect(screen.getByText("65%")).toBeInTheDocument()
      expect(screen.getByText("16 km/h")).toBeInTheDocument()
      expect(screen.getByText("☀️")).toBeInTheDocument()
      expect(screen.getByText("Partly cloudy")).toBeInTheDocument()
    })

    it("renders nighttime", () => {
      render(
        <openmeteoDefinition.Widget
          temperature={10}
          humidity={80}
          windSpeed={5}
          weatherCode={0}
          isDay={false}
        />
      )
      expect(screen.getByText("10°C")).toBeInTheDocument()
      expect(screen.getByText("🌙")).toBeInTheDocument()
      expect(screen.getByText("Clear sky")).toBeInTheDocument()
    })

    it("shows Unknown for unknown weather code", () => {
      render(
        <openmeteoDefinition.Widget
          temperature={15}
          humidity={50}
          windSpeed={10}
          weatherCode={999}
          isDay={true}
        />
      )
      expect(screen.getByText("Unknown")).toBeInTheDocument()
    })
  })
})
