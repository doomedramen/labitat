import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { uptimeKumaDefinition } from "@/lib/adapters/uptime-kuma"

describe("uptime-kuma definition", () => {
  it("has correct metadata", () => {
    expect(uptimeKumaDefinition.id).toBe("uptime-kuma")
    expect(uptimeKumaDefinition.name).toBe("Uptime Kuma")
    expect(uptimeKumaDefinition.icon).toBe("uptime-kuma")
    expect(uptimeKumaDefinition.category).toBe("monitoring")
    expect(uptimeKumaDefinition.defaultPollingMs).toBe(15_000)
  })

  it("has configFields defined", () => {
    expect(uptimeKumaDefinition.configFields).toBeDefined()
    expect(uptimeKumaDefinition.configFields).toHaveLength(2)
    expect(uptimeKumaDefinition.configFields[0].key).toBe("url")
    expect(uptimeKumaDefinition.configFields[0].type).toBe("url")
    expect(uptimeKumaDefinition.configFields[0].required).toBe(true)
    expect(uptimeKumaDefinition.configFields[1].key).toBe("slug")
    expect(uptimeKumaDefinition.configFields[1].type).toBe("text")
    expect(uptimeKumaDefinition.configFields[1].required).toBe(false)
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("fetches data successfully", async () => {
      const twoHoursAgo = new Date(
        Date.now() - 2 * 60 * 60 * 1000
      ).toISOString()
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/status-page?")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                incident: {
                  title: "Network Outage",
                  createdDate: twoHoursAgo,
                },
              }),
          })
        }
        if (url.includes("/api/status-page/heartbeat?")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                heartbeatList: {
                  "1": [{ status: 1 }, { status: 1 }],
                  "2": [{ status: 1 }, { status: 0 }],
                  "3": [{ status: 1 }, { status: 1 }],
                },
                uptimeList: { "1": 0.999, "2": 0.955, "3": 0.998 },
              }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await uptimeKumaDefinition.fetchData!({
        url: "https://uptime-kuma.example.com/",
        slug: "default",
      })

      expect(result._status).toBe("ok")
      expect(result.up).toBe(2)
      expect(result.down).toBe(1)
      expect(result.uptime).toBe("98.4%")
      expect(result.incident).toBeDefined()
      expect(result.incident?.title).toBe("Network Outage")
      expect(result.incident?.hoursAgo).toBeCloseTo(2, 0)
    })

    it("throws on API error", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 500 }))

      await expect(
        uptimeKumaDefinition.fetchData!({
          url: "https://uptime-kuma.example.com",
        })
      ).rejects.toThrow("Failed to fetch Uptime Kuma data")
    })

    it("handles empty data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )

      const result = await uptimeKumaDefinition.fetchData!({
        url: "https://uptime-kuma.example.com",
      })

      expect(result._status).toBe("ok")
      expect(result.up).toBe(0)
      expect(result.down).toBe(0)
      expect(result.uptime).toBe("0%")
      expect(result.incident).toBeUndefined()
    })

    it("uses default slug when not provided", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )
      vi.stubGlobal("fetch", mockFetch)

      await uptimeKumaDefinition.fetchData!({
        url: "https://uptime-kuma.example.com",
      })

      expect(mockFetch).toHaveBeenCalledWith(
        "https://uptime-kuma.example.com/api/status-page?slug=default"
      )
    })
  })

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = uptimeKumaDefinition.toPayload!({
        _status: "ok",
        up: 10,
        down: 2,
        uptime: "98.5%",
      })
      expect(payload.stats).toHaveLength(3)
      expect(payload.stats[0].value).toBe("10")
      expect(payload.stats[0].label).toBe("Up")
      expect(payload.stats[1].value).toBe("2")
      expect(payload.stats[1].label).toBe("Down")
      expect(payload.stats[2].value).toBe("98.5%")
      expect(payload.stats[2].label).toBe("Uptime")
    })

    it("includes incident stat when present", () => {
      const payload = uptimeKumaDefinition.toPayload!({
        _status: "ok",
        up: 10,
        down: 2,
        uptime: "98.5%",
        incident: {
          title: "Network Outage",
          createdDate: "2024-01-15T10:00:00Z",
          hoursAgo: 2.5,
        },
      })
      expect(payload.stats).toHaveLength(4)
      expect(payload.stats[3].value).toBe("3h ago") // Math.round(2.5) = 3
      expect(payload.stats[3].label).toBe("Incident")
      expect(payload.stats[3].tooltip).toBe("Network Outage")
    })

    it("handles zero values", () => {
      const payload = uptimeKumaDefinition.toPayload!({
        _status: "ok",
        up: 0,
        down: 0,
        uptime: "0%",
      })
      expect(payload.stats[0].value).toBe("0")
      expect(payload.stats[1].value).toBe("0")
      expect(payload.stats[2].value).toBe("0%")
    })
  })
})
