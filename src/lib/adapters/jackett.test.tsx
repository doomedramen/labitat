import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { jackettDefinition } from "@/lib/adapters/jackett"

describe("jackett definition", () => {
  it("has correct metadata", () => {
    expect(jackettDefinition.id).toBe("jackett")
    expect(jackettDefinition.name).toBe("Jackett")
    expect(jackettDefinition.icon).toBe("jackett")
    expect(jackettDefinition.category).toBe("downloads")
    expect(jackettDefinition.defaultPollingMs).toBe(30_000)
  })

  it("has configFields defined", () => {
    expect(jackettDefinition.configFields).toBeDefined()
    expect(jackettDefinition.configFields).toHaveLength(3)
    expect(jackettDefinition.configFields[0].key).toBe("url")
    expect(jackettDefinition.configFields[0].type).toBe("url")
    expect(jackettDefinition.configFields[0].required).toBe(true)
    expect(jackettDefinition.configFields[1].key).toBe("apiKey")
    expect(jackettDefinition.configFields[1].type).toBe("password")
    expect(jackettDefinition.configFields[1].required).toBe(true)
    expect(jackettDefinition.configFields[2].key).toBe("password")
    expect(jackettDefinition.configFields[2].type).toBe("password")
    expect(jackettDefinition.configFields[2].required).toBe(false)
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("fetches data successfully", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { id: 1, last_error: null },
              { id: 2, last_error: "Timeout" },
              { id: 3, last_error: null },
              { id: 4, last_error: "Rate limited" },
            ]),
        })
      )

      const result = await jackettDefinition.fetchData!({
        url: "https://jackett.example.com/",
        apiKey: "test-key",
      })

      expect(result._status).toBe("ok")
      expect(result.configured).toBe(4)
      expect(result.errored).toBe(2)
    })

    it("throws on invalid API key", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }))

      await expect(
        jackettDefinition.fetchData!({
          url: "https://jackett.example.com",
          apiKey: "bad-key",
        })
      ).rejects.toThrow("Invalid API key")
    })

    it("throws on not found", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 404 }))

      await expect(
        jackettDefinition.fetchData!({
          url: "https://jackett.example.com",
          apiKey: "test-key",
        })
      ).rejects.toThrow("Jackett not found at this URL")
    })

    it("handles empty indexer list", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      )

      const result = await jackettDefinition.fetchData!({
        url: "https://jackett.example.com",
        apiKey: "test-key",
      })

      expect(result.configured).toBe(0)
      expect(result.errored).toBe(0)
    })

    it("authenticates with password when provided", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/UI/Dashboard")) {
          return Promise.resolve({
            ok: true,
            headers: { get: () => "session=abc123" },
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      })
      vi.stubGlobal("fetch", mockFetch)

      await jackettDefinition.fetchData!({
        url: "https://jackett.example.com",
        apiKey: "test-key",
        password: "admin-pass",
      })

      expect(mockFetch).toHaveBeenCalledWith(
        "https://jackett.example.com/UI/Dashboard",
        expect.objectContaining({ method: "POST" })
      )
    })
  })

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = jackettDefinition.toPayload!({
        _status: "ok",
        configured: 10,
        errored: 2,
      })
      expect(payload.stats).toHaveLength(2)
      expect(payload.stats[0].value).toBe("10")
      expect(payload.stats[0].label).toBe("Configured")
      expect(payload.stats[1].value).toBe("2")
      expect(payload.stats[1].label).toBe("Errored")
    })

    it("handles zero values", () => {
      const payload = jackettDefinition.toPayload!({
        _status: "ok",
        configured: 0,
        errored: 0,
      })
      expect(payload.stats.every((s) => s.value === "0")).toBe(true)
    })
  })
})
