import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { sonarrDefinition } from "@/lib/adapters/sonarr"

describe("sonarr definition", () => {
  it("has correct metadata", () => {
    expect(sonarrDefinition.id).toBe("sonarr")
    expect(sonarrDefinition.name).toBe("Sonarr")
    expect(sonarrDefinition.icon).toBe("sonarr")
    expect(sonarrDefinition.category).toBe("downloads")
    expect(sonarrDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has configFields defined", () => {
    expect(sonarrDefinition.configFields).toBeDefined()
    expect(sonarrDefinition.configFields).toHaveLength(2)
    expect(sonarrDefinition.configFields[0].key).toBe("url")
    expect(sonarrDefinition.configFields[0].type).toBe("url")
    expect(sonarrDefinition.configFields[0].required).toBe(true)
    expect(sonarrDefinition.configFields[1].key).toBe("apiKey")
    expect(sonarrDefinition.configFields[1].type).toBe("password")
    expect(sonarrDefinition.configFields[1].required).toBe(true)
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
        if (url.includes("/queue")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalCount: 3 }),
          })
        }
        if (url.includes("/series")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1 }, { id: 2 }, { id: 3 }]),
          })
        }
        if (url.includes("/wanted")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ total: 7 }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await sonarrDefinition.fetchData!({
        url: "https://sonarr.example.com/",
        apiKey: "test-key",
      })

      expect(result._status).toBe("ok")
      expect(result.queued).toBe(3)
      expect(result.missing).toBe(7)
      expect(result.wanted).toBe(7)
      expect(result.series).toBe(3)

      expect(mockFetch).toHaveBeenCalledTimes(3)
      expect(mockFetch).toHaveBeenCalledWith(
        "https://sonarr.example.com/api/v3/queue?includeUnknownSeriesItems=true",
        { headers: { "X-Api-Key": "test-key" } }
      )
    })

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }))

      await expect(
        sonarrDefinition.fetchData!({
          url: "https://sonarr.example.com",
          apiKey: "bad-key",
        })
      ).rejects.toThrow("Sonarr error: 401")
    })

    it("handles missing data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )

      const result = await sonarrDefinition.fetchData!({
        url: "https://sonarr.example.com",
        apiKey: "test-key",
      })

      expect(result.queued).toBe(0)
      expect(result.missing).toBe(0)
      expect(result.wanted).toBe(0)
      expect(result.series).toBe(0)
    })

    it("strips trailing slash from URL", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )
      vi.stubGlobal("fetch", mockFetch)

      await sonarrDefinition.fetchData!({
        url: "https://sonarr.example.com/",
        apiKey: "test-key",
      })

      const calls = mockFetch.mock.calls as [string, ...unknown[]][]
      for (const call of calls) {
        expect(call[0]).not.toMatch(/\/\/api/)
      }
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <sonarrDefinition.Widget
          queued={3}
          missing={7}
          wanted={10}
          series={25}
        />
      )
      expect(screen.getByText("3")).toBeInTheDocument()
      expect(screen.getByText("7")).toBeInTheDocument()
      expect(screen.getByText("10")).toBeInTheDocument()
      expect(screen.getByText("25")).toBeInTheDocument()
      expect(screen.getByText("Queued")).toBeInTheDocument()
      expect(screen.getByText("Missing")).toBeInTheDocument()
      expect(screen.getByText("Wanted")).toBeInTheDocument()
      expect(screen.getByText("Series")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      render(
        <sonarrDefinition.Widget queued={0} missing={0} wanted={0} series={0} />
      )
      expect(screen.getAllByText("0")).toHaveLength(4)
    })
  })
})
