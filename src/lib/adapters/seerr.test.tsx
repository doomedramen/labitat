import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { seerrDefinition } from "@/lib/adapters/seerr"

describe("seerr definition", () => {
  it("has correct metadata", () => {
    expect(seerrDefinition.id).toBe("seerr")
    expect(seerrDefinition.name).toBe("Overseerr (Seerr)")
    expect(seerrDefinition.icon).toBe("overseerr")
    expect(seerrDefinition.category).toBe("media")
    expect(seerrDefinition.defaultPollingMs).toBe(15_000)
  })

  it("has configFields defined", () => {
    expect(seerrDefinition.configFields).toBeDefined()
    expect(seerrDefinition.configFields).toHaveLength(2)
    expect(seerrDefinition.configFields[0].key).toBe("url")
    expect(seerrDefinition.configFields[0].type).toBe("url")
    expect(seerrDefinition.configFields[0].required).toBe(true)
    expect(seerrDefinition.configFields[1].key).toBe("apiKey")
    expect(seerrDefinition.configFields[1].type).toBe("password")
    expect(seerrDefinition.configFields[1].required).toBe(true)
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("fetches data successfully", async () => {
      const mockRequests = {
        results: [
          { status: 1 },
          { status: 1 },
          { status: 2 },
          { status: 3 },
          { status: 3 },
          { status: 3 },
          { status: 4 },
        ],
      }
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve(mockRequests),
        })
      )

      const result = await seerrDefinition.fetchData!({
        url: "https://overseerr.example.com/",
        apiKey: "test-key",
      })

      expect(result._status).toBe("ok")
      expect(result.pending).toBe(2)
      expect(result.approved).toBe(1)
      expect(result.available).toBe(3)
      expect(result.processing).toBe(1)
    })

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 403 }))

      await expect(
        seerrDefinition.fetchData!({
          url: "https://overseerr.example.com",
          apiKey: "bad-key",
        })
      ).rejects.toThrow("Overseerr error: 403")
    })

    it("handles empty results with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )

      const result = await seerrDefinition.fetchData!({
        url: "https://overseerr.example.com",
        apiKey: "test-key",
      })

      expect(result.pending).toBe(0)
      expect(result.approved).toBe(0)
      expect(result.available).toBe(0)
      expect(result.processing).toBe(0)
    })

    it("handles empty results array", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ results: [] }),
        })
      )

      const result = await seerrDefinition.fetchData!({
        url: "https://overseerr.example.com",
        apiKey: "test-key",
      })

      expect(result._status).toBe("ok")
      expect(result.pending).toBe(0)
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <seerrDefinition.Widget
          pending={2}
          approved={5}
          available={3}
          processing={1}
        />
      )
      expect(screen.getByText("2")).toBeInTheDocument()
      expect(screen.getByText("5")).toBeInTheDocument()
      expect(screen.getByText("3")).toBeInTheDocument()
      expect(screen.getByText("1")).toBeInTheDocument()
      expect(screen.getByText("Pending")).toBeInTheDocument()
      expect(screen.getByText("Approved")).toBeInTheDocument()
      expect(screen.getByText("Available")).toBeInTheDocument()
      expect(screen.getByText("Processing")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      render(
        <seerrDefinition.Widget
          pending={0}
          approved={0}
          available={0}
          processing={0}
        />
      )
      expect(screen.getAllByText("0")).toHaveLength(4)
    })
  })
})
