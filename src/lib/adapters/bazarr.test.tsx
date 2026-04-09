import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { bazarrDefinition } from "@/lib/adapters/bazarr"
import { TooltipProvider } from "@/components/ui/tooltip"

function renderWithTooltipProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

describe("bazarr definition", () => {
  it("has correct metadata", () => {
    expect(bazarrDefinition.id).toBe("bazarr")
    expect(bazarrDefinition.name).toBe("Bazarr")
    expect(bazarrDefinition.icon).toBe("bazarr")
    expect(bazarrDefinition.category).toBe("downloads")
    expect(bazarrDefinition.defaultPollingMs).toBe(15_000)
  })

  it("has configFields defined", () => {
    expect(bazarrDefinition.configFields).toBeDefined()
    expect(bazarrDefinition.configFields).toHaveLength(2)
    expect(bazarrDefinition.configFields[0].key).toBe("url")
    expect(bazarrDefinition.configFields[0].type).toBe("url")
    expect(bazarrDefinition.configFields[0].required).toBe(true)
    expect(bazarrDefinition.configFields[1].key).toBe("apiKey")
    expect(bazarrDefinition.configFields[1].type).toBe("password")
    expect(bazarrDefinition.configFields[1].required).toBe(true)
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
        if (url.includes("/movies")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ total: 15 }),
          })
        }
        if (url.includes("/episodes")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ total: 42 }),
          })
        }
        return Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await bazarrDefinition.fetchData!({
        url: "https://bazarr.example.com/",
        apiKey: "test-key",
      })

      expect(result._status).toBe("ok")
      expect(result.missingMovies).toBe(15)
      expect(result.missingEpisodes).toBe(42)
    })

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 500 }))

      await expect(
        bazarrDefinition.fetchData!({
          url: "https://bazarr.example.com",
          apiKey: "bad-key",
        })
      ).rejects.toThrow("Bazarr error: 500")
    })

    it("handles missing data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )

      const result = await bazarrDefinition.fetchData!({
        url: "https://bazarr.example.com",
        apiKey: "test-key",
      })

      expect(result.missingMovies).toBe(0)
      expect(result.missingEpisodes).toBe(0)
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      renderWithTooltipProvider(
        <bazarrDefinition.Widget missingMovies={15} missingEpisodes={42} />
      )
      expect(screen.getByText("15")).toBeInTheDocument()
      expect(screen.getByText("42")).toBeInTheDocument()
      expect(screen.getByText("Missing Movies")).toBeInTheDocument()
      expect(screen.getByText("Missing Episodes")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      renderWithTooltipProvider(
        <bazarrDefinition.Widget missingMovies={0} missingEpisodes={0} />
      )
      expect(screen.getAllByText("0")).toHaveLength(2)
    })
  })
})
