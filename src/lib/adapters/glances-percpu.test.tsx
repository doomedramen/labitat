import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { glancesPerCpuDefinition } from "@/lib/adapters/glances-percpu"

describe("glances-percpu definition", () => {
  it("has correct metadata", () => {
    expect(glancesPerCpuDefinition.id).toBe("glances-percpu")
    expect(glancesPerCpuDefinition.name).toBe("Glances Per-CPU")
    expect(glancesPerCpuDefinition.icon).toBe("glances")
    expect(glancesPerCpuDefinition.category).toBe("monitoring")
    expect(glancesPerCpuDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has configFields defined", () => {
    expect(glancesPerCpuDefinition.configFields).toBeDefined()
    expect(glancesPerCpuDefinition.configFields).toHaveLength(3)
    expect(glancesPerCpuDefinition.configFields[0].key).toBe("url")
    expect(glancesPerCpuDefinition.configFields[0].type).toBe("url")
    expect(glancesPerCpuDefinition.configFields[0].required).toBe(true)
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
              { cpu_number: 0, total: 45, user: 20, system: 25, idle: 55 },
              { cpu_number: 1, total: 60, user: 30, system: 30, idle: 40 },
              { cpu_number: 2, total: 30, user: 15, system: 15, idle: 70 },
              { cpu_number: 3, total: 80, user: 40, system: 40, idle: 20 },
            ]),
        })
      )

      const result = await glancesPerCpuDefinition.fetchData!({
        url: "https://glances.example.com/",
      })

      expect(result._status).toBe("ok")
      expect(result.cores).toBe(4)
      expect(result.maxCore).toBe(80)
      expect(result.avgCpu).toBe(54)
    })

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 500 }))

      await expect(
        glancesPerCpuDefinition.fetchData!({
          url: "https://glances.example.com",
        })
      ).rejects.toThrow("Glances error: 500")
    })

    it("handles empty cores list", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      )

      const result = await glancesPerCpuDefinition.fetchData!({
        url: "https://glances.example.com",
      })

      expect(result.cores).toBe(0)
      expect(result.maxCore).toBe(0)
      expect(result.avgCpu).toBe(0)
    })

    it("uses Basic auth when credentials provided", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      )
      vi.stubGlobal("fetch", mockFetch)

      await glancesPerCpuDefinition.fetchData!({
        url: "https://glances.example.com",
        username: "admin",
        password: "secret",
      })

      expect(mockFetch).toHaveBeenCalledWith(
        "https://glances.example.com/api/4/percpu",
        {
          headers: {
            Authorization: `Basic ${btoa("admin:secret")}`,
          },
        }
      )
    })
  })

  describe("renderWidget", () => {
    it("is defined", () => {
      expect(glancesPerCpuDefinition.renderWidget).toBeDefined()
      expect(typeof glancesPerCpuDefinition.renderWidget).toBe("function")
    })
  })
})
