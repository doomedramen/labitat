import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { readarrDefinition } from "@/lib/adapters/readarr"

describe("readarr definition", () => {
  it("has correct metadata", () => {
    expect(readarrDefinition.id).toBe("readarr")
    expect(readarrDefinition.name).toBe("Readarr")
    expect(readarrDefinition.icon).toBe("readarr")
    expect(readarrDefinition.category).toBe("downloads")
    expect(readarrDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has configFields defined", () => {
    expect(readarrDefinition.configFields).toBeDefined()
    expect(readarrDefinition.configFields).toHaveLength(2)
    expect(readarrDefinition.configFields[0].key).toBe("url")
    expect(readarrDefinition.configFields[0].type).toBe("url")
    expect(readarrDefinition.configFields[0].required).toBe(true)
    expect(readarrDefinition.configFields[1].key).toBe("apiKey")
    expect(readarrDefinition.configFields[1].type).toBe("password")
    expect(readarrDefinition.configFields[1].required).toBe(true)
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
        if (url.includes("/book")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                { id: 1, statistics: { bookFileCount: 1 } },
                { id: 2, statistics: { bookFileCount: 2 } },
                { id: 3, statistics: { bookFileCount: 0 } },
                { id: 4, statistics: { bookFileCount: 1 } },
              ]),
          })
        }
        if (url.includes("/wanted/missing")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalRecords: 15 }),
          })
        }
        if (url.includes("/queue/status")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ totalCount: 3 }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await readarrDefinition.fetchData!({
        url: "https://readarr.example.com/",
        apiKey: "test-key",
      })

      expect(result._status).toBe("ok")
      expect(result.books).toBe(3) // 3 books with bookFileCount > 0
      expect(result.wanted).toBe(15)
      expect(result.queued).toBe(3)
    })

    it("throws on invalid API key", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }))

      await expect(
        readarrDefinition.fetchData!({
          url: "https://readarr.example.com",
          apiKey: "bad-key",
        })
      ).rejects.toThrow("Invalid API key")
    })

    it("throws on not found", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 404 }))

      await expect(
        readarrDefinition.fetchData!({
          url: "https://readarr.example.com",
          apiKey: "test-key",
        })
      ).rejects.toThrow("Readarr not found at this URL")
    })

    it("handles missing optional endpoints gracefully", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/book")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                { id: 1, statistics: { bookFileCount: 1 } },
                { id: 2, statistics: { bookFileCount: 0 } },
              ]),
          })
        }
        if (url.includes("/wanted/missing") || url.includes("/queue/status")) {
          return Promise.resolve({ ok: false, status: 500 })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await readarrDefinition.fetchData!({
        url: "https://readarr.example.com",
        apiKey: "test-key",
      })

      expect(result.books).toBe(1) // 1 book with bookFileCount > 0
      expect(result.wanted).toBe(0)
      expect(result.queued).toBe(0)
    })
  })

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = readarrDefinition.toPayload!({
        _status: "ok",
        queued: 3,
        wanted: 15,
        books: 50,
      })
      expect(payload.stats).toHaveLength(3)
      expect(payload.stats[0].value).toBe(15)
      expect(payload.stats[0].label).toBe("Wanted")
      expect(payload.stats[1].value).toBe(3)
      expect(payload.stats[1].label).toBe("Queued")
      expect(payload.stats[2].value).toBe(50)
      expect(payload.stats[2].label).toBe("Books")
    })

    it("handles zero values", () => {
      const payload = readarrDefinition.toPayload!({
        _status: "ok",
        queued: 0,
        wanted: 0,
        books: 0,
      })
      expect(payload.stats.every((s) => s.value === 0)).toBe(true)
    })
  })
})
