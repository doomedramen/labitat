import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { grafanaDefinition } from "@/lib/adapters/grafana"

describe("grafana definition", () => {
  it("has correct metadata", () => {
    expect(grafanaDefinition.id).toBe("grafana")
    expect(grafanaDefinition.name).toBe("Grafana")
    expect(grafanaDefinition.icon).toBe("grafana")
    expect(grafanaDefinition.category).toBe("monitoring")
    expect(grafanaDefinition.defaultPollingMs).toBe(15_000)
  })

  it("has configFields defined", () => {
    expect(grafanaDefinition.configFields).toBeDefined()
    expect(grafanaDefinition.configFields).toHaveLength(2)
    expect(grafanaDefinition.configFields[0].key).toBe("url")
    expect(grafanaDefinition.configFields[0].type).toBe("url")
    expect(grafanaDefinition.configFields[0].required).toBe(true)
    expect(grafanaDefinition.configFields[1].key).toBe("apiKey")
    expect(grafanaDefinition.configFields[1].type).toBe("password")
    expect(grafanaDefinition.configFields[1].required).toBe(true)
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("fetches data successfully", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/admin/stats")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                dashboards: 25,
                datasources: 5,
                alerts: 10,
              }),
          })
        }
        if (url.includes("/api/alerts")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                { state: "alerting" },
                { state: "ok" },
                { state: "alerting" },
                { state: "pending" },
              ]),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await grafanaDefinition.fetchData!({
        url: "https://grafana.example.com/",
        apiKey: "test-key",
      })

      expect(result._status).toBe("ok")
      expect(result.dashboards).toBe(25)
      expect(result.datasources).toBe(5)
      expect(result.totalAlerts).toBe(10)
      expect(result.alertsTriggered).toBe(2)
    })

    it("throws on invalid API key", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }))

      await expect(
        grafanaDefinition.fetchData!({
          url: "https://grafana.example.com",
          apiKey: "bad-key",
        })
      ).rejects.toThrow("Invalid API key")
    })

    it("throws on not found", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 404 }))

      await expect(
        grafanaDefinition.fetchData!({
          url: "https://grafana.example.com",
          apiKey: "test-key",
        })
      ).rejects.toThrow("Grafana not found at this URL")
    })

    it("handles failed alerts endpoint gracefully", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/admin/stats")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                dashboards: 10,
                datasources: 3,
                alerts: 5,
              }),
          })
        }
        if (url.includes("/api/alerts")) {
          return Promise.resolve({ ok: false, status: 500 })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await grafanaDefinition.fetchData!({
        url: "https://grafana.example.com",
        apiKey: "test-key",
      })

      expect(result._status).toBe("ok")
      expect(result.dashboards).toBe(10)
      expect(result.alertsTriggered).toBe(0)
    })

    it("handles missing data with defaults", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/admin/stats")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          })
        }
        if (url.includes("/api/alerts")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await grafanaDefinition.fetchData!({
        url: "https://grafana.example.com",
        apiKey: "test-key",
      })

      expect(result.dashboards).toBe(0)
      expect(result.datasources).toBe(0)
      expect(result.totalAlerts).toBe(0)
      expect(result.alertsTriggered).toBe(0)
    })

    it("rejects on network error", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.reject(new TypeError("Network request failed"))
      )

      await expect(
        grafanaDefinition.fetchData!({
          url: "https://grafana.example.com",
          apiKey: "test-key",
        })
      ).rejects.toThrow("Network request failed")
    })

    it("rejects on timeout", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.reject(
          new DOMException("The operation was aborted", "AbortError")
        )
      )

      await expect(
        grafanaDefinition.fetchData!({
          url: "https://grafana.example.com",
          apiKey: "test-key",
        })
      ).rejects.toThrow("The operation was aborted")
    })

    it("rejects on malformed JSON", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.reject(new SyntaxError("Unexpected token")),
        })
      )

      await expect(
        grafanaDefinition.fetchData!({
          url: "https://grafana.example.com",
          apiKey: "test-key",
        })
      ).rejects.toThrow("Unexpected token")
    })
  })

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = grafanaDefinition.toPayload!({
        _status: "ok",
        dashboards: 25,
        datasources: 5,
        totalAlerts: 10,
        alertsTriggered: 2,
      })
      expect(payload.stats).toHaveLength(4)
      expect(payload.stats[0].value).toBe("25")
      expect(payload.stats[0].label).toBe("Dashboards")
      expect(payload.stats[1].value).toBe("5")
      expect(payload.stats[1].label).toBe("Datasources")
      expect(payload.stats[2].value).toBe("10")
      expect(payload.stats[2].label).toBe("Total Alerts")
      expect(payload.stats[3].value).toBe("2")
      expect(payload.stats[3].label).toBe("Alerts Triggered")
    })

    it("handles zero values", () => {
      const payload = grafanaDefinition.toPayload!({
        _status: "ok",
        dashboards: 0,
        datasources: 0,
        totalAlerts: 0,
        alertsTriggered: 0,
      })
      expect(payload.stats.every((s) => s.value === "0")).toBe(true)
    })
  })
})
