import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { unmanicDefinition } from "@/lib/adapters/unmanic"

describe("unmanic definition", () => {
  it("has correct metadata", () => {
    expect(unmanicDefinition.id).toBe("unmanic")
    expect(unmanicDefinition.name).toBe("Unmanic")
    expect(unmanicDefinition.icon).toBe("unmanic")
    expect(unmanicDefinition.category).toBe("media")
    expect(unmanicDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has configFields defined", () => {
    expect(unmanicDefinition.configFields).toBeDefined()
    expect(unmanicDefinition.configFields).toHaveLength(2)
    expect(unmanicDefinition.configFields[0].key).toBe("url")
    expect(unmanicDefinition.configFields[0].type).toBe("url")
    expect(unmanicDefinition.configFields[0].required).toBe(true)
    expect(unmanicDefinition.configFields[1].key).toBe("apiKey")
    expect(unmanicDefinition.configFields[1].type).toBe("password")
    expect(unmanicDefinition.configFields[1].required).toBe(false)
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
              status: {
                active_workers: 2,
                queue_length: 5,
                completed_today: 10,
                total_completed: 150,
              },
            }),
        })
      )

      const result = await unmanicDefinition.fetchData!({
        url: "https://unmanic.example.com/",
        apiKey: "test-key",
      })

      expect(result._status).toBe("ok")
      expect(result.activeWorkers).toBe(2)
      expect(result.queuedItems).toBe(5)
      expect(result.completedToday).toBe(10)
      expect(result.totalCompleted).toBe(150)
    })

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 500 }))

      await expect(
        unmanicDefinition.fetchData!({
          url: "https://unmanic.example.com",
          apiKey: "bad-key",
        })
      ).rejects.toThrow("Unmanic error: 500")
    })

    it("handles missing data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )

      const result = await unmanicDefinition.fetchData!({
        url: "https://unmanic.example.com",
        apiKey: "test-key",
      })

      expect(result.activeWorkers).toBe(0)
      expect(result.queuedItems).toBe(0)
      expect(result.completedToday).toBe(0)
      expect(result.totalCompleted).toBe(0)
    })

    it("uses POST method with JSON body", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: {} }),
        })
      )
      vi.stubGlobal("fetch", mockFetch)

      await unmanicDefinition.fetchData!({
        url: "https://unmanic.example.com",
        apiKey: "secret-key",
      })

      expect(mockFetch).toHaveBeenCalledWith(
        "https://unmanic.example.com/unmanic/api/v1/status",
        {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ api_key: "secret-key" }),
        }
      )
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <unmanicDefinition.Widget
          activeWorkers={2}
          queuedItems={5}
          completedToday={10}
          totalCompleted={150}
        />
      )
      expect(screen.getByText("2")).toBeInTheDocument()
      expect(screen.getByText("5")).toBeInTheDocument()
      expect(screen.getByText("10")).toBeInTheDocument()
      expect(screen.getByText("150")).toBeInTheDocument()
      expect(screen.getByText("Active")).toBeInTheDocument()
      expect(screen.getByText("Queued")).toBeInTheDocument()
      expect(screen.getByText("Today")).toBeInTheDocument()
      expect(screen.getByText("Total")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      render(
        <unmanicDefinition.Widget
          activeWorkers={0}
          queuedItems={0}
          completedToday={0}
          totalCompleted={0}
        />
      )
      expect(screen.getAllByText("0")).toHaveLength(4)
    })
  })
})
