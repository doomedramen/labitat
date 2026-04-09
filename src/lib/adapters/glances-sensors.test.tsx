import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { glancesSensorsDefinition } from "@/lib/adapters/glances-sensors"

describe("glances-sensors definition", () => {
  it("has correct metadata", () => {
    expect(glancesSensorsDefinition.id).toBe("glances-sensors")
    expect(glancesSensorsDefinition.name).toBe("Glances Sensors")
    expect(glancesSensorsDefinition.icon).toBe("glances")
    expect(glancesSensorsDefinition.category).toBe("monitoring")
    expect(glancesSensorsDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has configFields defined", () => {
    expect(glancesSensorsDefinition.configFields).toBeDefined()
    expect(glancesSensorsDefinition.configFields).toHaveLength(3)
    expect(glancesSensorsDefinition.configFields[0].key).toBe("url")
    expect(glancesSensorsDefinition.configFields[0].type).toBe("url")
    expect(glancesSensorsDefinition.configFields[0].required).toBe(true)
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
            Promise.resolve([
              { type: "temperature_core", label: "Package id 0", value: 65 },
              { type: "temperature_core", label: "Core 1", value: 70 },
              { type: "fan_speed", label: "fan1", value: 1500 },
            ]),
        })
      )

      const result = await glancesSensorsDefinition.fetchData!({
        url: "https://glances.example.com/",
      })

      expect(result._status).toBe("ok")
      expect(result.cpuTemp).toBe(65)
      expect(result.maxTemp).toBe(70)
      expect(result.fanSpeed).toBe(1500)
    })

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 500 }))

      await expect(
        glancesSensorsDefinition.fetchData!({
          url: "https://glances.example.com",
        })
      ).rejects.toThrow("Glances error: 500")
    })

    it("handles empty sensors list", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      )

      const result = await glancesSensorsDefinition.fetchData!({
        url: "https://glances.example.com",
      })

      expect(result.cpuTemp).toBe(0)
      expect(result.maxTemp).toBe(0)
      expect(result.fanSpeed).toBe(0)
    })

    it("uses Basic auth when credentials provided", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      )
      vi.stubGlobal("fetch", mockFetch)

      await glancesSensorsDefinition.fetchData!({
        url: "https://glances.example.com",
        username: "admin",
        password: "secret",
      })

      expect(mockFetch).toHaveBeenCalledWith(
        "https://glances.example.com/api/4/sensors",
        {
          headers: {
            Authorization: `Basic ${btoa("admin:secret")}`,
          },
        }
      )
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <glancesSensorsDefinition.Widget
          cpuTemp={65}
          maxTemp={70}
          fanSpeed={1500}
        />
      )
      expect(screen.getByText("65°C")).toBeInTheDocument()
      expect(screen.getByText("70°C")).toBeInTheDocument()
      expect(screen.getByText("1500 RPM")).toBeInTheDocument()
      expect(screen.getByText("CPU Temp")).toBeInTheDocument()
      expect(screen.getByText("Max")).toBeInTheDocument()
      expect(screen.getByText("Fan")).toBeInTheDocument()
    })

    it("renders N/A for fan when speed is 0", () => {
      render(
        <glancesSensorsDefinition.Widget
          cpuTemp={45}
          maxTemp={50}
          fanSpeed={0}
        />
      )
      expect(screen.getByText("N/A")).toBeInTheDocument()
    })

    it("applies amber color for moderate temps (60-80)", () => {
      const { container } = render(
        <glancesSensorsDefinition.Widget
          cpuTemp={70}
          maxTemp={75}
          fanSpeed={1200}
        />
      )
      const amberElement = container.querySelector(".text-amber-500")
      expect(amberElement).toBeInTheDocument()
    })

    it("applies destructive color for high temps (>80)", () => {
      const { container } = render(
        <glancesSensorsDefinition.Widget
          cpuTemp={90}
          maxTemp={95}
          fanSpeed={2000}
        />
      )
      const destructiveElement = container.querySelector(".text-destructive")
      expect(destructiveElement).toBeInTheDocument()
    })
  })
})
