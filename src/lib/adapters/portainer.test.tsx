import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { portainerDefinition } from "@/lib/adapters/portainer"

describe("portainer definition", () => {
  it("has correct metadata", () => {
    expect(portainerDefinition.id).toBe("portainer")
    expect(portainerDefinition.name).toBe("Portainer")
    expect(portainerDefinition.icon).toBe("portainer")
    expect(portainerDefinition.category).toBe("monitoring")
    expect(portainerDefinition.defaultPollingMs).toBe(15_000)
  })

  it("has configFields defined", () => {
    expect(portainerDefinition.configFields).toBeDefined()
    expect(portainerDefinition.configFields).toHaveLength(4)
    expect(portainerDefinition.configFields[0].key).toBe("url")
    expect(portainerDefinition.configFields[0].type).toBe("url")
    expect(portainerDefinition.configFields[0].required).toBe(true)
    expect(portainerDefinition.configFields[1].key).toBe("username")
    expect(portainerDefinition.configFields[1].type).toBe("text")
    expect(portainerDefinition.configFields[1].required).toBe(true)
    expect(portainerDefinition.configFields[2].key).toBe("password")
    expect(portainerDefinition.configFields[2].type).toBe("password")
    expect(portainerDefinition.configFields[2].required).toBe(true)
    expect(portainerDefinition.configFields[3].key).toBe("endpointId")
    expect(portainerDefinition.configFields[3].type).toBe("text")
    expect(portainerDefinition.configFields[3].required).toBe(false)
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
        if (url.includes("/api/auth")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ jwt: "jwt-token" }),
          })
        }
        if (url.includes("/containers/json")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                { State: "running" },
                { State: "running" },
                { State: "exited" },
                { State: "running" },
              ]),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await portainerDefinition.fetchData!({
        url: "https://portainer.example.com/",
        username: "admin",
        password: "secret",
        endpointId: "1",
      })

      expect(result._status).toBe("ok")
      expect(result.running).toBe(3)
      expect(result.stopped).toBe(1)
      expect(result.total).toBe(4)
    })

    it("throws on invalid credentials", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 400 }))

      await expect(
        portainerDefinition.fetchData!({
          url: "https://portainer.example.com",
          username: "admin",
          password: "wrong",
        })
      ).rejects.toThrow("Invalid username or password")
    })

    it("throws on not found", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 404 }))

      await expect(
        portainerDefinition.fetchData!({
          url: "https://portainer.example.com",
          username: "admin",
          password: "secret",
        })
      ).rejects.toThrow("Portainer not found at this URL")
    })

    it("handles failed containers endpoint gracefully", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/auth")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ jwt: "jwt-token" }),
          })
        }
        return Promise.resolve({ ok: false, status: 500 })
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await portainerDefinition.fetchData!({
        url: "https://portainer.example.com",
        username: "admin",
        password: "secret",
      })

      expect(result._status).toBe("ok")
      expect(result.running).toBe(0)
      expect(result.stopped).toBe(0)
      expect(result.total).toBe(0)
    })

    it("uses default endpointId when not provided", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/auth")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ jwt: "jwt-token" }),
          })
        }
        if (url.includes("/containers/json")) {
          expect(url).toContain("/endpoints/1/docker/")
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      await portainerDefinition.fetchData!({
        url: "https://portainer.example.com",
        username: "admin",
        password: "secret",
      })
    })
  })

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = portainerDefinition.toPayload!({
        _status: "ok",
        running: 3,
        stopped: 1,
        total: 4,
      })
      expect(payload.stats).toHaveLength(3)
      expect(payload.stats[0].value).toBe("3")
      expect(payload.stats[0].label).toBe("Running")
      expect(payload.stats[1].value).toBe("1")
      expect(payload.stats[1].label).toBe("Stopped")
      expect(payload.stats[2].value).toBe("4")
      expect(payload.stats[2].label).toBe("Total")
    })

    it("handles zero values", () => {
      const payload = portainerDefinition.toPayload!({
        _status: "ok",
        running: 0,
        stopped: 0,
        total: 0,
      })
      expect(payload.stats.every((s) => s.value === "0")).toBe(true)
    })
  })
})
