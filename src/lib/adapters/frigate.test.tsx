import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { frigateDefinition } from "@/lib/adapters/frigate"

describe("frigate definition", () => {
  it("has correct metadata", () => {
    expect(frigateDefinition.id).toBe("frigate")
    expect(frigateDefinition.name).toBe("Frigate")
    expect(frigateDefinition.icon).toBe("frigate")
    expect(frigateDefinition.category).toBe("monitoring")
    expect(frigateDefinition.defaultPollingMs).toBe(30_000)
  })

  it("has configFields defined", () => {
    expect(frigateDefinition.configFields).toBeDefined()
    expect(frigateDefinition.configFields).toHaveLength(3)
    expect(frigateDefinition.configFields[0].key).toBe("url")
    expect(frigateDefinition.configFields[0].type).toBe("url")
    expect(frigateDefinition.configFields[0].required).toBe(true)
    expect(frigateDefinition.configFields[1].key).toBe("username")
    expect(frigateDefinition.configFields[1].type).toBe("text")
    expect(frigateDefinition.configFields[1].required).toBe(false)
    expect(frigateDefinition.configFields[2].key).toBe("password")
    expect(frigateDefinition.configFields[2].type).toBe("password")
    expect(frigateDefinition.configFields[2].required).toBe(false)
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
            Promise.resolve({
              cameras: {
                front: {},
                back: {},
                garage: {},
              },
              service: {
                uptime: 86400,
                version: "0.14.0",
              },
            }),
        })
      )

      const result = await frigateDefinition.fetchData!({
        url: "https://frigate.example.com/",
      })

      expect(result._status).toBe("ok")
      expect(result.cameras).toBe(3)
      expect(result.uptime).toBe(86400)
      expect(result.version).toBe("0.14.0")
    })

    it("throws on login failure", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }))

      await expect(
        frigateDefinition.fetchData!({
          url: "https://frigate.example.com",
          username: "admin",
          password: "wrong",
        })
      ).rejects.toThrow("Failed to authenticate with Frigate")
    })

    it("throws on invalid credentials for stats endpoint", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/login")) {
          return Promise.resolve({
            ok: true,
            headers: { get: () => null },
          })
        }
        return Promise.resolve({ ok: false, status: 401 })
      })
      vi.stubGlobal("fetch", mockFetch)

      await expect(
        frigateDefinition.fetchData!({
          url: "https://frigate.example.com",
          username: "admin",
          password: "secret",
        })
      ).rejects.toThrow("Invalid credentials")
    })

    it("throws on not found", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 404 }))

      await expect(
        frigateDefinition.fetchData!({
          url: "https://frigate.example.com",
        })
      ).rejects.toThrow("Frigate not found at this URL")
    })

    it("handles missing data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )

      const result = await frigateDefinition.fetchData!({
        url: "https://frigate.example.com",
      })

      expect(result.cameras).toBe(0)
      expect(result.uptime).toBe(0)
      expect(result.version).toBe("unknown")
    })

    it("authenticates when credentials provided", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/login")) {
          return Promise.resolve({
            ok: true,
            headers: { get: () => "session=abc123" },
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ cameras: {}, service: {} }),
        })
      })
      vi.stubGlobal("fetch", mockFetch)

      await frigateDefinition.fetchData!({
        url: "https://frigate.example.com",
        username: "admin",
        password: "secret",
      })

      expect(mockFetch).toHaveBeenCalledWith(
        "https://frigate.example.com/api/login",
        expect.objectContaining({ method: "POST" })
      )
    })
  })

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = frigateDefinition.toPayload!({
        _status: "ok",
        cameras: 3,
        uptime: 86400,
        version: "0.14.0",
      })
      expect(payload.stats).toHaveLength(3)
      expect(payload.stats[0].value).toBe("3")
      expect(payload.stats[0].label).toBe("Cameras")
      expect(payload.stats[1].value).toBe("1d 0h")
      expect(payload.stats[1].label).toBe("Uptime")
      expect(payload.stats[2].value).toBe("0.14.0")
      expect(payload.stats[2].label).toBe("Version")
    })

    it("handles zero values", () => {
      const payload = frigateDefinition.toPayload!({
        _status: "ok",
        cameras: 0,
        uptime: 0,
        version: "unknown",
      })
      expect(payload.stats[0].value).toBe("0")
      expect(payload.stats[1].value).toBe("0m")
      expect(payload.stats[2].value).toBe("unknown")
    })

    it("formats uptime with hours", () => {
      const payload = frigateDefinition.toPayload!({
        _status: "ok",
        cameras: 1,
        uptime: 7200,
        version: "0.14.0",
      })
      expect(payload.stats[1].value).toBe("2h 0m")
    })
  })
})
