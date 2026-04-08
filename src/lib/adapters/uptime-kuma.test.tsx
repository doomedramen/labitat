import { render, screen } from "@testing-library/react"
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
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/status-page?")) {
          return Promise.resolve({ ok: true })
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

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(<uptimeKumaDefinition.Widget up={10} down={2} uptime="98.5%" />)
      expect(screen.getByText("10")).toBeInTheDocument()
      expect(screen.getByText("2")).toBeInTheDocument()
      expect(screen.getByText("98.5%")).toBeInTheDocument()
      expect(screen.getByText("Up")).toBeInTheDocument()
      expect(screen.getByText("Down")).toBeInTheDocument()
      expect(screen.getByText("Uptime")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      render(<uptimeKumaDefinition.Widget up={0} down={0} uptime="0%" />)
      expect(screen.getAllByText("0")).toHaveLength(2)
      expect(screen.getByText("0%")).toBeInTheDocument()
    })
  })
})
