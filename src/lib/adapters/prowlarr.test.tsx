import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { prowlarrDefinition } from "@/lib/adapters/prowlarr"

describe("prowlarr definition", () => {
  it("has correct metadata", () => {
    expect(prowlarrDefinition.id).toBe("prowlarr")
    expect(prowlarrDefinition.name).toBe("Prowlarr")
    expect(prowlarrDefinition.icon).toBe("prowlarr")
    expect(prowlarrDefinition.category).toBe("downloads")
    expect(prowlarrDefinition.defaultPollingMs).toBe(15_000)
  })

  it("has configFields defined", () => {
    expect(prowlarrDefinition.configFields).toBeDefined()
    expect(prowlarrDefinition.configFields).toHaveLength(2)
    expect(prowlarrDefinition.configFields[0].key).toBe("url")
    expect(prowlarrDefinition.configFields[0].type).toBe("url")
    expect(prowlarrDefinition.configFields[0].required).toBe(true)
    expect(prowlarrDefinition.configFields[1].key).toBe("apiKey")
    expect(prowlarrDefinition.configFields[1].type).toBe("password")
    expect(prowlarrDefinition.configFields[1].required).toBe(true)
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
        if (url.includes("/indexerstats")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                indexers: [
                  { numberOfQueries: 100, numberOfGrabs: 30 },
                  { numberOfQueries: 50, numberOfGrabs: 12 },
                ],
              }),
          })
        }
        if (url.includes("/indexer")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1 }, { id: 2 }]),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await prowlarrDefinition.fetchData!({
        url: "https://prowlarr.example.com/",
        apiKey: "test-key",
      })

      expect(result._status).toBe("ok")
      expect(result.queries).toBe(150)
      expect(result.grabs).toBe(42)
      expect(result.indexers).toBe(2)

      expect(mockFetch).toHaveBeenCalledTimes(2)
    })

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 500 }))

      await expect(
        prowlarrDefinition.fetchData!({
          url: "https://prowlarr.example.com",
          apiKey: "bad-key",
        })
      ).rejects.toThrow("Prowlarr error: 500")
    })

    it("handles missing data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )

      const result = await prowlarrDefinition.fetchData!({
        url: "https://prowlarr.example.com",
        apiKey: "test-key",
      })

      expect(result.queries).toBe(0)
      expect(result.grabs).toBe(0)
      expect(result.indexers).toBe(0)
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <prowlarrDefinition.Widget queries={150} grabs={42} indexers={10} />
      )
      expect(screen.getByText("150")).toBeInTheDocument()
      expect(screen.getByText("42")).toBeInTheDocument()
      expect(screen.getByText("10")).toBeInTheDocument()
      expect(screen.getByText("Queries")).toBeInTheDocument()
      expect(screen.getByText("Grabs")).toBeInTheDocument()
      expect(screen.getByText("Indexers")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      render(<prowlarrDefinition.Widget queries={0} grabs={0} indexers={0} />)
      expect(screen.getAllByText("0")).toHaveLength(3)
    })
  })
})
