import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { glancesDefinition } from "@/lib/adapters/glances"

describe("glances definition", () => {
  it("has correct metadata", () => {
    expect(glancesDefinition.id).toBe("glances")
    expect(glancesDefinition.name).toBe("Glances")
    expect(glancesDefinition.icon).toBe("glances")
    expect(glancesDefinition.category).toBe("monitoring")
    expect(glancesDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has configFields defined", () => {
    expect(glancesDefinition.configFields).toBeDefined()
    expect(glancesDefinition.configFields).toHaveLength(3)
    expect(glancesDefinition.configFields[0].key).toBe("url")
    expect(glancesDefinition.configFields[0].type).toBe("url")
    expect(glancesDefinition.configFields[0].required).toBe(true)
    expect(glancesDefinition.configFields[1].key).toBe("username")
    expect(glancesDefinition.configFields[1].type).toBe("text")
    expect(glancesDefinition.configFields[1].required).toBe(false)
    expect(glancesDefinition.configFields[2].key).toBe("password")
    expect(glancesDefinition.configFields[2].type).toBe("password")
    expect(glancesDefinition.configFields[2].required).toBe(false)
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
              cpu: 45.5,
              mem: 62.3,
              memory_total: 16000000000,
              swap: 10.2,
              load: { min1: 1.5, cpucore: 4 },
              uptime: 86400,
            }),
        })
      )

      const result = await glancesDefinition.fetchData!({
        url: "https://glances.example.com/",
      })

      expect(result._status).toBe("ok")
      expect(result.cpuPercent).toBe(46)
      expect(result.memPercent).toBe(62)
      expect(result.swapPercent).toBe(10)
      expect(result.load1).toBe(0.375)
      expect(result.uptime).toBe("1d 0h")
    })

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 500 }))

      await expect(
        glancesDefinition.fetchData!({
          url: "https://glances.example.com",
        })
      ).rejects.toThrow("Glances error: 500")
    })

    it("handles missing data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )

      const result = await glancesDefinition.fetchData!({
        url: "https://glances.example.com",
      })

      expect(result.cpuPercent).toBe(0)
      expect(result.memPercent).toBe(0)
      expect(result.swapPercent).toBe(0)
      expect(result.load1).toBe(0)
      expect(result.uptime).toBe("0h 0m")
    })

    it("uses Basic auth when credentials provided", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )
      vi.stubGlobal("fetch", mockFetch)

      await glancesDefinition.fetchData!({
        url: "https://glances.example.com",
        username: "admin",
        password: "secret",
      })

      expect(mockFetch).toHaveBeenCalledWith(
        "https://glances.example.com/api/4/quicklook",
        {
          headers: {
            Authorization: `Basic ${btoa("admin:secret")}`,
          },
        }
      )
    })

    it("calculates load per CPU core when available", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              cpu: 50,
              mem: 50,
              memory_total: 8000000000,
              swap: 0,
              load: { min1: 4, cpucore: 2 },
              uptime: 3600,
            }),
        })
      )

      const result = await glancesDefinition.fetchData!({
        url: "https://glances.example.com",
      })

      expect(result.load1).toBe(2)
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <glancesDefinition.Widget
          cpuPercent={45}
          memPercent={62}
          memUsed="9.3 GB"
          swapPercent={10}
          load1={1.5}
          uptime="1d 0h"
        />
      )
      expect(screen.getByText("45%")).toBeInTheDocument()
      expect(screen.getByText("62%")).toBeInTheDocument()
      expect(screen.getByText("9.3 GB")).toBeInTheDocument()
      expect(screen.getByText("10%")).toBeInTheDocument()
      expect(screen.getByText("1.50")).toBeInTheDocument()
      expect(screen.getByText("1d 0h")).toBeInTheDocument()
    })

    it("applies destructive color when CPU > 90%", () => {
      const { container } = render(
        <glancesDefinition.Widget
          cpuPercent={95}
          memPercent={50}
          memUsed="4 GB"
          swapPercent={0}
          load1={0.5}
          uptime="0h 30m"
        />
      )
      const cpuElement = container.querySelector(".text-destructive")
      expect(cpuElement).toBeInTheDocument()
      expect(cpuElement).toHaveTextContent("95%")
    })

    it("applies destructive color when RAM > 90%", () => {
      const { container } = render(
        <glancesDefinition.Widget
          cpuPercent={50}
          memPercent={95}
          memUsed="15 GB"
          swapPercent={0}
          load1={0.5}
          uptime="0h 30m"
        />
      )
      const memElements = container.querySelectorAll(".text-destructive")
      expect(memElements.length).toBeGreaterThan(0)
    })

    it("handles zero values", () => {
      render(
        <glancesDefinition.Widget
          cpuPercent={0}
          memPercent={0}
          memUsed="0 B"
          swapPercent={0}
          load1={0}
          uptime="0h 0m"
        />
      )
      expect(screen.getAllByText("0%")).toHaveLength(3)
      expect(screen.getByText("0.00")).toBeInTheDocument()
    })
  })
})
