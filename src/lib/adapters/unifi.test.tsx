import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { unifiDefinition } from "@/lib/adapters/unifi"

describe("unifi definition", () => {
  it("has correct metadata", () => {
    expect(unifiDefinition.id).toBe("unifi")
    expect(unifiDefinition.name).toBe("UniFi")
    expect(unifiDefinition.icon).toBe("unifi")
    expect(unifiDefinition.category).toBe("monitoring")
    expect(unifiDefinition.defaultPollingMs).toBe(15_000)
  })

  it("has configFields defined", () => {
    expect(unifiDefinition.configFields).toBeDefined()
    expect(unifiDefinition.configFields).toHaveLength(3)
    expect(unifiDefinition.configFields[0].key).toBe("url")
    expect(unifiDefinition.configFields[0].type).toBe("url")
    expect(unifiDefinition.configFields[0].required).toBe(true)
    expect(unifiDefinition.configFields[1].key).toBe("username")
    expect(unifiDefinition.configFields[1].type).toBe("text")
    expect(unifiDefinition.configFields[1].required).toBe(true)
    expect(unifiDefinition.configFields[2].key).toBe("password")
    expect(unifiDefinition.configFields[2].type).toBe("password")
    expect(unifiDefinition.configFields[2].required).toBe(true)
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
        if (url.includes("/api/login")) {
          return Promise.resolve({
            ok: true,
            headers: { getSetCookie: () => ["TOKEN=abc123"] },
          })
        }
        if (url.includes("/stat/sta/all")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: [
                  { is_guest: false },
                  { is_guest: false },
                  { is_guest: true },
                  { is_guest: true },
                  { is_guest: true },
                ],
              }),
          })
        }
        if (url.includes("/rest/device")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                data: [{}, {}, {}],
              }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await unifiDefinition.fetchData!({
        url: "https://unifi.example.com/",
        username: "admin",
        password: "secret",
      })

      expect(result._status).toBe("ok")
      expect(result.users).toBe(2)
      expect(result.guests).toBe(3)
      expect(result.devices).toBe(3)
      expect(result.sites).toBe(1)
    })

    it("throws on login failure", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }))

      await expect(
        unifiDefinition.fetchData!({
          url: "https://unifi.example.com",
          username: "admin",
          password: "wrong",
        })
      ).rejects.toThrow("UniFi login failed: 401")
    })

    it("throws on API error after login", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/login")) {
          return Promise.resolve({
            ok: true,
            headers: { getSetCookie: () => ["TOKEN=abc123"] },
          })
        }
        return Promise.resolve({ ok: false, status: 500 })
      })
      vi.stubGlobal("fetch", mockFetch)

      await expect(
        unifiDefinition.fetchData!({
          url: "https://unifi.example.com",
          username: "admin",
          password: "secret",
        })
      ).rejects.toThrow("UniFi error: 500")
    })

    it("handles empty data gracefully", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/login")) {
          return Promise.resolve({
            ok: true,
            headers: { getSetCookie: () => ["TOKEN=abc123"] },
          })
        }
        if (url.includes("/stat/sta/all")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          })
        }
        if (url.includes("/rest/device")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ data: [] }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await unifiDefinition.fetchData!({
        url: "https://unifi.example.com",
        username: "admin",
        password: "secret",
      })

      expect(result.users).toBe(0)
      expect(result.guests).toBe(0)
      expect(result.devices).toBe(0)
    })
  })

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = unifiDefinition.toPayload!({
        _status: "ok",
        users: 10,
        guests: 5,
        devices: 3,
        sites: 1,
      })
      expect(payload.stats).toHaveLength(4)
      expect(payload.stats[0].value).toBe(10)
      expect(payload.stats[0].label).toBe("Users")
      expect(payload.stats[1].value).toBe(5)
      expect(payload.stats[1].label).toBe("Guests")
      expect(payload.stats[2].value).toBe(3)
      expect(payload.stats[2].label).toBe("Devices")
      expect(payload.stats[3].value).toBe(1)
      expect(payload.stats[3].label).toBe("Sites")
    })

    it("handles zero values", () => {
      const payload = unifiDefinition.toPayload!({
        _status: "ok",
        users: 0,
        guests: 0,
        devices: 0,
        sites: 0,
      })
      expect(payload.stats.every((s) => s.value === 0)).toBe(true)
    })
  })
})
