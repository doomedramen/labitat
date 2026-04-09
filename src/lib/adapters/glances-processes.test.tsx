import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { glancesProcessesDefinition } from "@/lib/adapters/glances-processes"

describe("glances-processes definition", () => {
  it("has correct metadata", () => {
    expect(glancesProcessesDefinition.id).toBe("glances-processes")
    expect(glancesProcessesDefinition.name).toBe("Glances Processes")
    expect(glancesProcessesDefinition.icon).toBe("glances")
    expect(glancesProcessesDefinition.category).toBe("monitoring")
    expect(glancesProcessesDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has configFields defined", () => {
    expect(glancesProcessesDefinition.configFields).toBeDefined()
    expect(glancesProcessesDefinition.configFields).toHaveLength(5)
    expect(glancesProcessesDefinition.configFields[0].key).toBe("url")
    expect(glancesProcessesDefinition.configFields[0].type).toBe("url")
    expect(glancesProcessesDefinition.configFields[0].required).toBe(true)
    expect(glancesProcessesDefinition.configFields[4].key).toBe("sortBy")
    expect(glancesProcessesDefinition.configFields[4].type).toBe("select")
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("fetches data successfully sorted by CPU", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { name: "nginx", cpu_percent: 45, memory_percent: 10, pid: 100 },
              { name: "python", cpu_percent: 80, memory_percent: 25, pid: 200 },
              { name: "node", cpu_percent: 30, memory_percent: 15, pid: 300 },
            ]),
        })
      )

      const result = await glancesProcessesDefinition.fetchData!({
        url: "https://glances.example.com/",
        sortBy: "cpu",
        topCount: "2",
      })

      expect(result._status).toBe("ok")
      expect(result.processes).toHaveLength(2)
      expect(result.processes?.[0].name).toBe("python")
      expect(result.processes?.[0].cpu).toBe(80)
      expect(result.processes?.[1].name).toBe("nginx")
    })

    it("sorts by memory when configured", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve([
              { name: "nginx", cpu_percent: 45, memory_percent: 10, pid: 100 },
              { name: "python", cpu_percent: 80, memory_percent: 25, pid: 200 },
            ]),
        })
      )

      const result = await glancesProcessesDefinition.fetchData!({
        url: "https://glances.example.com/",
        sortBy: "memory",
      })

      expect(result.processes?.[0].name).toBe("python")
      expect(result.processes?.[0].memory).toBe(25)
    })

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 500 }))

      await expect(
        glancesProcessesDefinition.fetchData!({
          url: "https://glances.example.com",
        })
      ).rejects.toThrow("Glances error: 500")
    })

    it("handles empty process list", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      )

      const result = await glancesProcessesDefinition.fetchData!({
        url: "https://glances.example.com",
      })

      expect(result.processes).toEqual([])
    })

    it("uses Basic auth when credentials provided", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      )
      vi.stubGlobal("fetch", mockFetch)

      await glancesProcessesDefinition.fetchData!({
        url: "https://glances.example.com",
        username: "admin",
        password: "secret",
      })

      expect(mockFetch).toHaveBeenCalledWith(
        "https://glances.example.com/api/4/processlist",
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
      expect(glancesProcessesDefinition.renderWidget).toBeDefined()
      expect(typeof glancesProcessesDefinition.renderWidget).toBe("function")
    })
  })
})
