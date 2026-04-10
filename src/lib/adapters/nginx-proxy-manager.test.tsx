import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import {
  nginxProxyManagerDefinition,
  tokenCache,
} from "@/lib/adapters/nginx-proxy-manager"

describe("nginx-proxy-manager definition", () => {
  it("has correct metadata", () => {
    expect(nginxProxyManagerDefinition.id).toBe("nginx-proxy-manager")
    expect(nginxProxyManagerDefinition.name).toBe("Nginx Proxy Manager")
    expect(nginxProxyManagerDefinition.icon).toBe("nginx-proxy-manager")
    expect(nginxProxyManagerDefinition.category).toBe("networking")
    expect(nginxProxyManagerDefinition.defaultPollingMs).toBe(15_000)
  })

  it("has configFields defined", () => {
    expect(nginxProxyManagerDefinition.configFields).toBeDefined()
    expect(nginxProxyManagerDefinition.configFields).toHaveLength(3)
    expect(nginxProxyManagerDefinition.configFields[0].key).toBe("url")
    expect(nginxProxyManagerDefinition.configFields[0].type).toBe("url")
    expect(nginxProxyManagerDefinition.configFields[0].required).toBe(true)
    expect(nginxProxyManagerDefinition.configFields[1].key).toBe("email")
    expect(nginxProxyManagerDefinition.configFields[1].type).toBe("text")
    expect(nginxProxyManagerDefinition.configFields[1].required).toBe(true)
    expect(nginxProxyManagerDefinition.configFields[2].key).toBe("password")
    expect(nginxProxyManagerDefinition.configFields[2].type).toBe("password")
    expect(nginxProxyManagerDefinition.configFields[2].required).toBe(true)
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
      // Clear token cache between tests
      if (tokenCache) tokenCache.clear()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("fetches data successfully", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/tokens")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ token: "jwt-token", expires: 3600 }),
          })
        }
        if (url.includes("/proxy-hosts")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1 }, { id: 2 }]),
          })
        }
        if (url.includes("/redirection-hosts")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1 }]),
          })
        }
        if (url.includes("/streams")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1 }, { id: 2 }, { id: 3 }]),
          })
        }
        if (url.includes("/dead-hosts")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await nginxProxyManagerDefinition.fetchData!({
        url: "https://npm.example.com/",
        email: "admin@example.org",
        password: "secret",
      })

      expect(result._status).toBe("ok")
      expect(result.hosts).toBe(2)
      expect(result.redirHosts).toBe(1)
      expect(result.streams).toBe(3)
      expect(result.deadHosts).toBe(0)
    })

    it("uses cached token on subsequent calls", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/tokens")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ token: "jwt-token", expires: 3600 }),
          })
        }
        if (url.includes("/proxy-hosts")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1 }]),
          })
        }
        if (url.includes("/redirection-hosts")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          })
        }
        if (url.includes("/streams")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          })
        }
        if (url.includes("/dead-hosts")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      // First call - should login
      await nginxProxyManagerDefinition.fetchData!({
        url: "https://npm.example.com",
        email: "admin@example.org",
        password: "secret",
      })

      // Second call - should use cached token
      await nginxProxyManagerDefinition.fetchData!({
        url: "https://npm.example.com",
        email: "admin@example.org",
        password: "secret",
      })

      // Login should only have been called once
      const loginCalls = mockFetch.mock.calls.filter((call) =>
        (call[0] as string).includes("/api/tokens")
      ).length
      expect(loginCalls).toBe(1)
    })

    it("throws on login failure", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }))

      await expect(
        nginxProxyManagerDefinition.fetchData!({
          url: "https://npm.example.com",
          email: "admin@example.org",
          password: "wrong",
        })
      ).rejects.toThrow("NPM login failed: 401")
    })

    it("handles failed individual endpoints gracefully", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/tokens")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ token: "jwt-token", expires: 3600 }),
          })
        }
        if (url.includes("/proxy-hosts")) {
          return Promise.resolve({ ok: false, status: 500 })
        }
        if (url.includes("/redirection-hosts")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1 }]),
          })
        }
        if (url.includes("/streams")) {
          return Promise.resolve({ ok: false, status: 403 })
        }
        if (url.includes("/dead-hosts")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await nginxProxyManagerDefinition.fetchData!({
        url: "https://npm.example.com",
        email: "admin@example.org",
        password: "secret",
      })

      expect(result._status).toBe("ok")
      expect(result.hosts).toBe(0)
      expect(result.redirHosts).toBe(1)
      expect(result.streams).toBe(0)
      expect(result.deadHosts).toBe(0)
    })
  })

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = nginxProxyManagerDefinition.toPayload!({
        _status: "ok",
        hosts: 5,
        redirHosts: 2,
        streams: 3,
        deadHosts: 1,
      })
      expect(payload.stats).toHaveLength(4)
      expect(payload.stats[0].value).toBe(5)
      expect(payload.stats[0].label).toBe("Proxy Hosts")
      expect(payload.stats[1].value).toBe(2)
      expect(payload.stats[1].label).toBe("Redirections")
      expect(payload.stats[2].value).toBe(3)
      expect(payload.stats[2].label).toBe("Streams")
      expect(payload.stats[3].value).toBe(1)
      expect(payload.stats[3].label).toBe("Disabled")
    })

    it("handles zero values", () => {
      const payload = nginxProxyManagerDefinition.toPayload!({
        _status: "ok",
        hosts: 0,
        redirHosts: 0,
        streams: 0,
        deadHosts: 0,
      })
      expect(payload.stats.every((s) => s.value === 0)).toBe(true)
    })
  })
})
