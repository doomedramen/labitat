import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { lidarrDefinition } from "@/lib/adapters/lidarr"

describe("lidarr definition", () => {
  it("has correct metadata", () => {
    expect(lidarrDefinition.id).toBe("lidarr")
    expect(lidarrDefinition.name).toBe("Lidarr")
    expect(lidarrDefinition.icon).toBe("lidarr")
    expect(lidarrDefinition.category).toBe("downloads")
    expect(lidarrDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has configFields defined", () => {
    expect(lidarrDefinition.configFields).toBeDefined()
    expect(lidarrDefinition.configFields).toHaveLength(2)
    expect(lidarrDefinition.configFields[0].key).toBe("url")
    expect(lidarrDefinition.configFields[0].type).toBe("url")
    expect(lidarrDefinition.configFields[0].required).toBe(true)
    expect(lidarrDefinition.configFields[1].key).toBe("apiKey")
    expect(lidarrDefinition.configFields[1].type).toBe("password")
    expect(lidarrDefinition.configFields[1].required).toBe(true)
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
        if (url.includes("/artist")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1 }, { id: 2 }, { id: 3 }]),
          })
        }
        if (url.includes("/wanted/missing")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalRecords: 10 }),
          })
        }
        if (url.includes("/queue/status")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalCount: 5 }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await lidarrDefinition.fetchData!({
        url: "https://lidarr.example.com/",
        apiKey: "test-key",
      })

      expect(result._status).toBe("ok")
      expect(result.artists).toBe(3)
      expect(result.wanted).toBe(10)
      expect(result.queued).toBe(5)
    })

    it("throws on invalid API key", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }))

      await expect(
        lidarrDefinition.fetchData!({
          url: "https://lidarr.example.com",
          apiKey: "bad-key",
        })
      ).rejects.toThrow("Invalid API key")
    })

    it("throws on not found", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 404 }))

      await expect(
        lidarrDefinition.fetchData!({
          url: "https://lidarr.example.com",
          apiKey: "test-key",
        })
      ).rejects.toThrow("Lidarr not found at this URL")
    })

    it("handles missing optional endpoints gracefully", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/artist")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1 }]),
          })
        }
        if (url.includes("/wanted/missing") || url.includes("/queue/status")) {
          return Promise.resolve({ ok: false, status: 500 })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await lidarrDefinition.fetchData!({
        url: "https://lidarr.example.com",
        apiKey: "test-key",
      })

      expect(result.artists).toBe(1)
      expect(result.wanted).toBe(0)
      expect(result.queued).toBe(0)
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(<lidarrDefinition.Widget queued={5} wanted={10} artists={25} />)
      expect(screen.getByText("5")).toBeInTheDocument()
      expect(screen.getByText("10")).toBeInTheDocument()
      expect(screen.getByText("25")).toBeInTheDocument()
      expect(screen.getByText("Wanted")).toBeInTheDocument()
      expect(screen.getByText("Queued")).toBeInTheDocument()
      expect(screen.getByText("Artists")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      render(<lidarrDefinition.Widget queued={0} wanted={0} artists={0} />)
      expect(screen.getAllByText("0")).toHaveLength(3)
    })
  })
})
