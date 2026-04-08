import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { adguardDefinition } from "@/lib/adapters/adguard"

describe("adguard definition", () => {
  it("has correct metadata", () => {
    expect(adguardDefinition.id).toBe("adguard")
    expect(adguardDefinition.name).toBe("AdGuard Home")
    expect(adguardDefinition.icon).toBe("adguard-home")
    expect(adguardDefinition.category).toBe("networking")
    expect(adguardDefinition.defaultPollingMs).toBe(15_000)
  })

  it("has configFields defined", () => {
    expect(adguardDefinition.configFields).toBeDefined()
    expect(adguardDefinition.configFields).toHaveLength(9)
    expect(adguardDefinition.configFields[0].key).toBe("url")
    expect(adguardDefinition.configFields[0].type).toBe("url")
    expect(adguardDefinition.configFields[0].required).toBe(true)
    expect(adguardDefinition.configFields[1].key).toBe("username")
    expect(adguardDefinition.configFields[1].type).toBe("text")
    expect(adguardDefinition.configFields[1].required).toBe(true)
    expect(adguardDefinition.configFields[2].key).toBe("password")
    expect(adguardDefinition.configFields[2].type).toBe("password")
    expect(adguardDefinition.configFields[2].required).toBe(true)
  })

  it("has boolean config fields with defaults", () => {
    const booleanFields = adguardDefinition.configFields.filter(
      (f) => f.type === "boolean"
    )
    expect(booleanFields).toHaveLength(6)
    expect(
      booleanFields.find((f) => f.key === "showQueries")?.defaultChecked
    ).toBe(true)
    expect(
      booleanFields.find((f) => f.key === "showParentalBlocked")?.defaultChecked
    ).toBe(false)
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
              num_dns_queries: 10000,
              num_blocked_filtering: 2500,
              num_blocked_parental: 100,
              num_blocked_safe_search: 50,
            }),
        })
      )

      const result = await adguardDefinition.fetchData!({
        url: "https://adguard.example.com/",
        username: "admin",
        password: "secret",
        showQueries: "true",
        showBlocked: "true",
        showBlockedPercent: "true",
        showParentalBlocked: "true",
        showSafeSearchBlocked: "true",
        showLatency: "true",
      })

      expect(result._status).toBe("ok")
      expect(result.queries).toBe(10000)
      expect(result.blocked).toBe(2500)
      expect(result.blockedPercent).toBe(25)
      expect(result.parentalBlocked).toBe(100)
      expect(result.safeSearchBlocked).toBe(50)
      expect(result.showQueries).toBe(true)
      expect(result.showParentalBlocked).toBe(true)
    })

    it("calculates blocked percent correctly", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              num_dns_queries: 200,
              num_blocked_filtering: 50,
            }),
        })
      )

      const result = await adguardDefinition.fetchData!({
        url: "https://adguard.example.com",
        username: "admin",
        password: "secret",
      })

      expect(result.blockedPercent).toBe(25)
    })

    it("handles zero queries gracefully", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              num_dns_queries: 0,
              num_blocked_filtering: 0,
            }),
        })
      )

      const result = await adguardDefinition.fetchData!({
        url: "https://adguard.example.com",
        username: "admin",
        password: "secret",
      })

      expect(result.blockedPercent).toBe(0)
    })

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }))

      await expect(
        adguardDefinition.fetchData!({
          url: "https://adguard.example.com",
          username: "admin",
          password: "wrong",
        })
      ).rejects.toThrow("AdGuard error: 401")
    })

    it("uses Basic auth header", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )
      vi.stubGlobal("fetch", mockFetch)

      await adguardDefinition.fetchData!({
        url: "https://adguard.example.com",
        username: "admin",
        password: "secret",
      })

      expect(mockFetch).toHaveBeenCalledWith(
        "https://adguard.example.com/control/stats",
        {
          headers: {
            Authorization: `Basic ${btoa("admin:secret")}`,
          },
        }
      )
    })
  })

  describe("Widget", () => {
    it("renders with default visible fields", () => {
      render(
        <adguardDefinition.Widget
          queries={10000}
          blocked={2500}
          blockedPercent={25}
          parentalBlocked={100}
          safeSearchBlocked={50}
        />
      )
      expect(screen.getByText("10000")).toBeInTheDocument()
      expect(screen.getByText("2500")).toBeInTheDocument()
      expect(screen.getByText("25.0%")).toBeInTheDocument()
      expect(screen.getByText("Queries")).toBeInTheDocument()
      expect(screen.getByText("Blocked")).toBeInTheDocument()
      expect(screen.getByText("Block Rate")).toBeInTheDocument()
    })

    it("hides fields when show flags are false", () => {
      render(
        <adguardDefinition.Widget
          queries={10000}
          blocked={2500}
          blockedPercent={25}
          parentalBlocked={100}
          safeSearchBlocked={50}
          showQueries={false}
          showBlocked={false}
          showBlockedPercent={false}
        />
      )
      expect(screen.queryByText("Queries")).not.toBeInTheDocument()
      expect(screen.queryByText("Blocked")).not.toBeInTheDocument()
      expect(screen.queryByText("Block Rate")).not.toBeInTheDocument()
    })

    it("shows optional fields when enabled", () => {
      render(
        <adguardDefinition.Widget
          queries={10000}
          blocked={2500}
          blockedPercent={25}
          parentalBlocked={100}
          safeSearchBlocked={50}
          latency={45}
          showParentalBlocked={true}
          showSafeSearchBlocked={true}
          showLatency={true}
        />
      )
      expect(screen.getByText("100")).toBeInTheDocument()
      expect(screen.getByText("50")).toBeInTheDocument()
      expect(screen.getByText("45ms")).toBeInTheDocument()
      expect(screen.getByText("Parental")).toBeInTheDocument()
      expect(screen.getByText("Safe Search")).toBeInTheDocument()
      expect(screen.getByText("Latency")).toBeInTheDocument()
    })
  })
})
