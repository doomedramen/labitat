import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { radarrDefinition } from "@/lib/adapters/radarr"

describe("radarr definition", () => {
  it("has correct metadata", () => {
    expect(radarrDefinition.id).toBe("radarr")
    expect(radarrDefinition.name).toBe("Radarr")
    expect(radarrDefinition.icon).toBe("radarr")
    expect(radarrDefinition.category).toBe("downloads")
    expect(radarrDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has configFields defined", () => {
    expect(radarrDefinition.configFields).toBeDefined()
    expect(radarrDefinition.configFields).toHaveLength(2)
    expect(radarrDefinition.configFields[0].key).toBe("url")
    expect(radarrDefinition.configFields[0].type).toBe("url")
    expect(radarrDefinition.configFields[0].required).toBe(true)
    expect(radarrDefinition.configFields[1].key).toBe("apiKey")
    expect(radarrDefinition.configFields[1].type).toBe("password")
    expect(radarrDefinition.configFields[1].required).toBe(true)
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
            json: () => Promise.resolve({ totalRecords: 5 }),
          })
        }
        if (url.includes("/movie")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1 }, { id: 2 }]),
          })
        }
        if (url.includes("/wanted/missing")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalRecords: 3 }),
          })
        }
        if (url.includes("/wanted/cutoff")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalRecords: 7 }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await radarrDefinition.fetchData!({
        url: "https://radarr.example.com/",
        apiKey: "test-key",
      })

      expect(result._status).toBe("ok")
      expect(result.queued).toBe(5)
      expect(result.missing).toBe(3)
      expect(result.wanted).toBe(7)
      expect(result.movies).toBe(2)

      expect(mockFetch).toHaveBeenCalledTimes(4)
      expect(mockFetch).toHaveBeenCalledWith(
        "https://radarr.example.com/api/v3/queue?pageSize=1",
        { headers: { "X-Api-Key": "test-key" } }
      )
    })

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 500 }))

      await expect(
        radarrDefinition.fetchData!({
          url: "https://radarr.example.com",
          apiKey: "bad-key",
        })
      ).rejects.toThrow("Radarr error: 500")
    })

    it("handles missing data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )

      const result = await radarrDefinition.fetchData!({
        url: "https://radarr.example.com",
        apiKey: "test-key",
      })

      expect(result.queued).toBe(0)
      expect(result.missing).toBe(0)
      expect(result.wanted).toBe(0)
      expect(result.movies).toBe(0)
    })

    it("strips trailing slash from URL", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )
      vi.stubGlobal("fetch", mockFetch)

      await radarrDefinition.fetchData!({
        url: "https://radarr.example.com/",
        apiKey: "test-key",
      })

      const calls = mockFetch.mock.calls as unknown as [string, ...unknown[]][]
      for (const call of calls) {
        expect(call[0]).not.toMatch(/\/\/api/)
      }
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <radarrDefinition.Widget
          queued={5}
          missing={3}
          wanted={10}
          movies={50}
        />
      )
      expect(screen.getByText("5")).toBeInTheDocument()
      expect(screen.getByText("3")).toBeInTheDocument()
      expect(screen.getByText("10")).toBeInTheDocument()
      expect(screen.getByText("50")).toBeInTheDocument()
      expect(screen.getByText("Queued")).toBeInTheDocument()
      expect(screen.getByText("Missing")).toBeInTheDocument()
      expect(screen.getByText("Wanted")).toBeInTheDocument()
      expect(screen.getByText("Movies")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      render(
        <radarrDefinition.Widget queued={0} missing={0} wanted={0} movies={0} />
      )
      expect(screen.getAllByText("0")).toHaveLength(4)
    })
  })
})
