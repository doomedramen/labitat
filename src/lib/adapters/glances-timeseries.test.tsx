import { render } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { glancesTimeseriesDefinition } from "@/lib/adapters/glances-timeseries"

describe("glances-timeseries definition", () => {
  it("has correct metadata", () => {
    expect(glancesTimeseriesDefinition.id).toBe("glances-timeseries")
    expect(glancesTimeseriesDefinition.name).toBe("Glances Timeseries")
    expect(glancesTimeseriesDefinition.icon).toBe("glances")
    expect(glancesTimeseriesDefinition.category).toBe("monitoring")
    expect(glancesTimeseriesDefinition.defaultPollingMs).toBe(15_000)
  })

  it("has configFields defined", () => {
    expect(glancesTimeseriesDefinition.configFields).toBeDefined()
    expect(glancesTimeseriesDefinition.configFields).toHaveLength(3)
    expect(glancesTimeseriesDefinition.configFields[0].key).toBe("url")
    expect(glancesTimeseriesDefinition.configFields[0].type).toBe("url")
    expect(glancesTimeseriesDefinition.configFields[0].required).toBe(true)
    expect(glancesTimeseriesDefinition.configFields[1].key).toBe("username")
    expect(glancesTimeseriesDefinition.configFields[1].type).toBe("text")
    expect(glancesTimeseriesDefinition.configFields[1].required).toBe(false)
    expect(glancesTimeseriesDefinition.configFields[2].key).toBe("password")
    expect(glancesTimeseriesDefinition.configFields[2].type).toBe("password")
    expect(glancesTimeseriesDefinition.configFields[2].required).toBe(false)
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
        if (url.includes("/cpu/history")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                total: [
                  ["2024-01-01T00:00:00Z", 45],
                  ["2024-01-01T00:01:00Z", 50],
                ],
              }),
          })
        }
        if (url.includes("/mem/history")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                percent: [
                  ["2024-01-01T00:00:00Z", 60],
                  ["2024-01-01T00:01:00Z", 62],
                ],
              }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await glancesTimeseriesDefinition.fetchData!({
        url: "https://glances.example.com/",
      })

      expect(result._status).toBe("ok")
      expect(result.history).toHaveLength(2)
      expect(result.history?.[0].cpu).toBe(45)
      expect(result.history?.[0].mem).toBe(60)
    })

    it("throws on CPU history error", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 500 }))

      await expect(
        glancesTimeseriesDefinition.fetchData!({
          url: "https://glances.example.com",
        })
      ).rejects.toThrow("Glances CPU history error: 500")
    })

    it("handles empty history with defaults", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/cpu/history")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          })
        }
        if (url.includes("/mem/history")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await glancesTimeseriesDefinition.fetchData!({
        url: "https://glances.example.com",
      })

      expect(result._status).toBe("ok")
      expect(result.history).toEqual([])
    })

    it("uses Basic auth when credentials provided", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total: [], percent: [] }),
        })
      )
      vi.stubGlobal("fetch", mockFetch)

      await glancesTimeseriesDefinition.fetchData!({
        url: "https://glances.example.com",
        username: "admin",
        password: "secret",
      })

      expect(mockFetch).toHaveBeenCalledWith(
        "https://glances.example.com/api/4/cpu/history/20",
        {
          headers: {
            Authorization: `Basic ${btoa("admin:secret")}`,
          },
        }
      )
      expect(mockFetch).toHaveBeenCalledWith(
        "https://glances.example.com/api/4/mem/history/20",
        {
          headers: {
            Authorization: `Basic ${btoa("admin:secret")}`,
          },
        }
      )
    })

    it("fetches last 20 data points", async () => {
      const mockFetch = vi.fn((url: string) => {
        expect(url).toMatch(/\/20$/)
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ total: [], percent: [] }),
        })
      })
      vi.stubGlobal("fetch", mockFetch)

      await glancesTimeseriesDefinition.fetchData!({
        url: "https://glances.example.com",
      })

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })
  })

  describe("renderWidget", () => {
    it("is defined", () => {
      expect(glancesTimeseriesDefinition.renderWidget).toBeDefined()
      expect(typeof glancesTimeseriesDefinition.renderWidget).toBe("function")
    })
  })
})
