import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { piholeDefinition } from "@/lib/adapters/pihole"

describe("pihole definition", () => {
  it("has correct metadata", () => {
    expect(piholeDefinition.id).toBe("pihole")
    expect(piholeDefinition.name).toBe("Pi-hole")
    expect(piholeDefinition.icon).toBe("pi-hole")
    expect(piholeDefinition.category).toBe("networking")
    expect(piholeDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has configFields defined", () => {
    expect(piholeDefinition.configFields).toBeDefined()
    expect(piholeDefinition.configFields).toHaveLength(2)
    expect(piholeDefinition.configFields[0].key).toBe("url")
    expect(piholeDefinition.configFields[0].type).toBe("url")
    expect(piholeDefinition.configFields[0].required).toBe(true)
    expect(piholeDefinition.configFields[1].key).toBe("password")
    expect(piholeDefinition.configFields[1].type).toBe("password")
    expect(piholeDefinition.configFields[1].required).toBe(true)
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("fetches data using v6 API", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/auth")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ session: { sid: "token123", valid: true } }),
          })
        }
        if (url.includes("/api/stats/summary")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                dns_queries_today: 10000,
                ads_blocked_today: 2500,
                ads_percentage_today: 25,
                domains_being_blocked: 150000,
              }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await piholeDefinition.fetchData!({
        url: "https://pihole.example.com/",
        password: "secret",
      })

      expect(result._status).toBe("ok")
      expect(result.queries).toBe(10000)
      expect(result.blocked).toBe(2500)
      expect(result.percentBlocked).toBe("25%")
      expect(result.domainsBlocked).toBe(150000)
    })

    it("falls back to v5 API when v6 auth fails", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/auth")) {
          return Promise.resolve({ ok: false, status: 404 })
        }
        if (url.includes("/admin/api.php")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                dns_queries_today: 5000,
                ads_blocked_today: 1000,
                ads_percentage_today: 20,
                domains_being_blocked: 100000,
              }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await piholeDefinition.fetchData!({
        url: "https://pihole.example.com",
        password: "secret",
      })

      expect(result._status).toBe("ok")
      expect(result.queries).toBe(5000)
      expect(result.blocked).toBe(1000)
      expect(result.percentBlocked).toBe("20%")
    })

    it("throws on v5 API error", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/auth")) {
          return Promise.resolve({ ok: false, status: 404 })
        }
        return Promise.resolve({ ok: false, status: 500 })
      })
      vi.stubGlobal("fetch", mockFetch)

      await expect(
        piholeDefinition.fetchData!({
          url: "https://pihole.example.com",
          password: "secret",
        })
      ).rejects.toThrow("Pi-hole error: 500")
    })

    it("throws on not found", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/auth")) {
          return Promise.resolve({ ok: false, status: 404 })
        }
        return Promise.resolve({ ok: false, status: 404 })
      })
      vi.stubGlobal("fetch", mockFetch)

      await expect(
        piholeDefinition.fetchData!({
          url: "https://pihole.example.com",
          password: "secret",
        })
      ).rejects.toThrow("Pi-hole not found at this URL")
    })

    it("handles missing data with defaults", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/api/auth")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({ session: { sid: "token123", valid: true } }),
          })
        }
        if (url.includes("/api/stats/summary")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await piholeDefinition.fetchData!({
        url: "https://pihole.example.com",
        password: "secret",
      })

      expect(result.queries).toBe(0)
      expect(result.blocked).toBe(0)
      expect(result.percentBlocked).toBe("0%")
      expect(result.domainsBlocked).toBe(0)
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <piholeDefinition.Widget
          queries={10000}
          blocked={2500}
          percentBlocked="25%"
          domainsBlocked={150000}
        />
      )
      expect(screen.getByText("10,000")).toBeInTheDocument()
      expect(screen.getByText("2,500")).toBeInTheDocument()
      expect(screen.getByText("25%")).toBeInTheDocument()
      expect(screen.getByText("150,000")).toBeInTheDocument()
      expect(screen.getByText("Queries")).toBeInTheDocument()
      expect(screen.getByText("Blocked")).toBeInTheDocument()
      expect(screen.getByText("Blocked %")).toBeInTheDocument()
      expect(screen.getByText("Domains")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      render(
        <piholeDefinition.Widget
          queries={0}
          blocked={0}
          percentBlocked="0%"
          domainsBlocked={0}
        />
      )
      expect(screen.getAllByText("0")).toHaveLength(3)
      expect(screen.getByText("0%")).toBeInTheDocument()
    })
  })
})
