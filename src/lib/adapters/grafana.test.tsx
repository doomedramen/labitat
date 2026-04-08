import { render, screen } from "@testing-library/react"
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
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <grafanaDefinition.Widget
          dashboards={25}
          datasources={5}
          totalAlerts={10}
          alertsTriggered={2}
        />
      )
      expect(screen.getByText("25")).toBeInTheDocument()
      expect(screen.getByText("5")).toBeInTheDocument()
      expect(screen.getByText("10")).toBeInTheDocument()
      expect(screen.getByText("2")).toBeInTheDocument()
      expect(screen.getByText("Dashboards")).toBeInTheDocument()
      expect(screen.getByText("Datasources")).toBeInTheDocument()
      expect(screen.getByText("Total Alerts")).toBeInTheDocument()
      expect(screen.getByText("Alerts Triggered")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      render(
        <grafanaDefinition.Widget
          dashboards={0}
          datasources={0}
          totalAlerts={0}
          alertsTriggered={0}
        />
      )
      expect(screen.getAllByText("0")).toHaveLength(4)
    })
  })
})
