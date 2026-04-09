import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { unmanicDefinition } from "@/lib/adapters/unmanic"

describe("unmanic definition", () => {
  it("has correct metadata", () => {
    expect(unmanicDefinition.id).toBe("unmanic")
    expect(unmanicDefinition.name).toBe("Unmanic")
    expect(unmanicDefinition.icon).toBe("unmanic")
    expect(unmanicDefinition.category).toBe("media")
    expect(unmanicDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has configFields defined", () => {
    expect(unmanicDefinition.configFields).toBeDefined()
    expect(unmanicDefinition.configFields).toHaveLength(2)
    expect(unmanicDefinition.configFields[0].key).toBe("url")
    expect(unmanicDefinition.configFields[0].type).toBe("url")
    expect(unmanicDefinition.configFields[0].required).toBe(true)
    expect(unmanicDefinition.configFields[1].key).toBe("apiKey")
    expect(unmanicDefinition.configFields[1].type).toBe("password")
    expect(unmanicDefinition.configFields[1].required).toBe(false)
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("fetches data successfully (v1 fallback)", async () => {
      const mockFetch = vi.fn((url: string) => {
        // v2 API fails, falls back to v1
        if (url.includes("/v2/")) {
          return Promise.reject(new Error("v2 not available"))
        }
        return Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              status: {
                active_workers: 2,
                queue_length: 5,
                completed_today: 10,
                total_completed: 150,
              },
            }),
        })
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await unmanicDefinition.fetchData!({
        url: "https://unmanic.example.com/",
        apiKey: "test-key",
      })

      expect(result._status).toBe("ok")
      expect(result.activeWorkers).toBe(2)
      expect(result.totalWorkers).toBe(2) // v1 doesn't have total, defaults to active
      expect(result.queuedItems).toBe(5)
      expect(result.completedToday).toBe(10)
      expect(result.totalCompleted).toBe(150)
    })

    it("fetches data successfully (v2 API)", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/v2/workers/status")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                workers_status: [
                  { idle: false },
                  { idle: true },
                  { idle: false },
                  { idle: true },
                ],
              }),
          })
        }
        if (url.includes("/v2/pending/tasks")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                recordsTotal: 15,
              }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await unmanicDefinition.fetchData!({
        url: "https://unmanic.example.com/",
        apiKey: "test-key",
      })

      expect(result._status).toBe("ok")
      expect(result.activeWorkers).toBe(2) // 2 non-idle workers
      expect(result.totalWorkers).toBe(4) // 4 total workers
      expect(result.queuedItems).toBe(15)
      expect(result.completedToday).toBe(0) // v2 doesn't provide this
      expect(result.totalCompleted).toBe(0) // v2 doesn't provide this
    })

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 500 }))

      await expect(
        unmanicDefinition.fetchData!({
          url: "https://unmanic.example.com",
          apiKey: "bad-key",
        })
      ).rejects.toThrow("Unmanic error: 500")
    })

    it("handles missing data with defaults", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/v2/")) {
          return Promise.reject(new Error("v2 not available"))
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await unmanicDefinition.fetchData!({
        url: "https://unmanic.example.com",
        apiKey: "test-key",
      })

      expect(result.activeWorkers).toBe(0)
      expect(result.totalWorkers).toBe(0)
      expect(result.queuedItems).toBe(0)
      expect(result.completedToday).toBe(0)
      expect(result.totalCompleted).toBe(0)
    })

    it("uses POST method with JSON body for v1 fallback", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/v2/")) {
          return Promise.reject(new Error("v2 not available"))
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: {} }),
        })
      })
      vi.stubGlobal("fetch", mockFetch)

      await unmanicDefinition.fetchData!({
        url: "https://unmanic.example.com",
        apiKey: "secret-key",
      })

      // Check that v1 endpoint was called with correct params
      const v1Call = mockFetch.mock.calls.find((call) =>
        call[0].includes("/v1/status")
      )
      expect(v1Call).toBeDefined()
      expect(v1Call![0]).toMatchObject({
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ api_key: "secret-key" }),
      })
    })
  })

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = unmanicDefinition.toPayload!({
        _status: "ok",
        activeWorkers: 2,
        totalWorkers: 4,
        queuedItems: 5,
        completedToday: 10,
        totalCompleted: 150,
      })
      expect(payload.stats).toHaveLength(5)
      expect(payload.stats[0].value).toBe(2)
      expect(payload.stats[0].label).toBe("Active")
      expect(payload.stats[1].value).toBe(4)
      expect(payload.stats[1].label).toBe("Total")
      expect(payload.stats[2].value).toBe(5)
      expect(payload.stats[2].label).toBe("Queued")
      expect(payload.stats[3].value).toBe(10)
      expect(payload.stats[3].label).toBe("Today")
      expect(payload.stats[4].value).toBe(150)
      expect(payload.stats[4].label).toBe("Total")
    })

    it("handles zero values", () => {
      const payload = unmanicDefinition.toPayload!({
        _status: "ok",
        activeWorkers: 0,
        totalWorkers: 0,
        queuedItems: 0,
        completedToday: 0,
        totalCompleted: 0,
      })
      expect(payload.stats.every((s) => s.value === 0)).toBe(true)
    })
  })
})
