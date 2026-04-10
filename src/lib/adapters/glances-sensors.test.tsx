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
        expect.objectContaining({
          headers: {
            Authorization: `Basic ${btoa("admin:secret")}`,
          },
        })
      )
    })
  })

  describe("renderWidget", () => {
    it("is defined", () => {
      expect(glancesSensorsDefinition.renderWidget).toBeDefined()
      expect(typeof glancesSensorsDefinition.renderWidget).toBe("function")
    })
  })

  describe("toPayload", () => {
    it("converts data to widget payload", () => {
      const payload = glancesSensorsDefinition.toPayload!({
        _status: "ok",
        cpuTemp: 65,
        maxTemp: 70,
        fanSpeed: 1500,
      })

      expect(payload.stats).toHaveLength(3)
      expect(payload.stats[0].id).toBe("cpu-temp")
      expect(payload.stats[0].value).toBe("65°C")
      expect(payload.stats[1].id).toBe("max-temp")
      expect(payload.stats[1].value).toBe("70°C")
      expect(payload.stats[2].id).toBe("fan-speed")
      expect(payload.stats[2].value).toBe("1500 RPM")
      expect(payload.customComponent).toBeDefined()
    })

    it("handles zero fan speed", () => {
      const payload = glancesSensorsDefinition.toPayload!({
        _status: "ok",
        cpuTemp: 50,
        maxTemp: 55,
        fanSpeed: 0,
      })

      expect(payload.stats[2].value).toBe("N/A")
    })
  })
})
