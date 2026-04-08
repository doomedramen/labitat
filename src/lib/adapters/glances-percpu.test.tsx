import { render, screen } from "@testing-library/react"
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
              { cpu: 45 },
              { cpu: 60 },
              { cpu: 30 },
              { cpu: 80 },
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
        "https://glances.example.com/api/4/cores",
        {
          headers: {
            Authorization: `Basic ${btoa("admin:secret")}`,
          },
        }
      )
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <glancesPerCpuDefinition.Widget cores={8} maxCore={95} avgCpu={45} />
      )
      expect(screen.getByText("8")).toBeInTheDocument()
      expect(screen.getByText("95%")).toBeInTheDocument()
      expect(screen.getByText("45%")).toBeInTheDocument()
      expect(screen.getByText("Cores")).toBeInTheDocument()
      expect(screen.getByText("Max Core")).toBeInTheDocument()
      expect(screen.getByText("Average")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      render(
        <glancesPerCpuDefinition.Widget cores={0} maxCore={0} avgCpu={0} />
      )
      expect(screen.getByText("0")).toBeInTheDocument()
      expect(screen.getAllByText("0%")).toHaveLength(2)
    })
  })
})
