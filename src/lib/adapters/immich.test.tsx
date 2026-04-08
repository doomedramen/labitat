import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { immichDefinition } from "@/lib/adapters/immich"

describe("immich definition", () => {
  it("has correct metadata", () => {
    expect(immichDefinition.id).toBe("immich")
    expect(immichDefinition.name).toBe("Immich")
    expect(immichDefinition.icon).toBe("immich")
    expect(immichDefinition.category).toBe("media")
    expect(immichDefinition.defaultPollingMs).toBe(60_000)
  })

  it("has configFields defined", () => {
    expect(immichDefinition.configFields).toBeDefined()
    expect(immichDefinition.configFields).toHaveLength(3)
    expect(immichDefinition.configFields[0].key).toBe("url")
    expect(immichDefinition.configFields[0].type).toBe("url")
    expect(immichDefinition.configFields[0].required).toBe(true)
    expect(immichDefinition.configFields[1].key).toBe("apiKey")
    expect(immichDefinition.configFields[1].type).toBe("password")
    expect(immichDefinition.configFields[1].required).toBe(true)
    expect(immichDefinition.configFields[2].key).toBe("version")
    expect(immichDefinition.configFields[2].type).toBe("select")
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
        if (url.includes("/version")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ major: 1, minor: 90 }),
          })
        }
        if (url.includes("/statistics") || url.includes("/stats")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                photos: 5000,
                videos: 500,
                usage: 50000000000,
                usageByUser: [{}, {}, {}],
              }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await immichDefinition.fetchData!({
        url: "https://immich.example.com/",
        apiKey: "test-key",
        version: "1",
      })

      expect(result._status).toBe("ok")
      expect(result.photos).toBe(5000)
      expect(result.videos).toBe(500)
      expect(result.users).toBe(3)
      expect(result.storage).toBe(50000000000)
    })

    it("throws on invalid API key", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }))

      await expect(
        immichDefinition.fetchData!({
          url: "https://immich.example.com",
          apiKey: "bad-key",
        })
      ).rejects.toThrow("Invalid API key")
    })

    it("throws on not found", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 404 }))

      await expect(
        immichDefinition.fetchData!({
          url: "https://immich.example.com",
          apiKey: "test-key",
        })
      ).rejects.toThrow("Immich not found at this URL")
    })

    it("handles missing data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )

      const result = await immichDefinition.fetchData!({
        url: "https://immich.example.com",
        apiKey: "test-key",
      })

      expect(result.photos).toBe(0)
      expect(result.videos).toBe(0)
      expect(result.users).toBe(0)
      expect(result.storage).toBe(0)
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <immichDefinition.Widget
          users={3}
          photos={5000}
          videos={500}
          storage={50000000000}
        />
      )
      expect(screen.getByText("3")).toBeInTheDocument()
      expect(screen.getByText("5000")).toBeInTheDocument()
      expect(screen.getByText("500")).toBeInTheDocument()
      expect(screen.getByText("50.0 GB")).toBeInTheDocument()
      expect(screen.getByText("Users")).toBeInTheDocument()
      expect(screen.getByText("Photos")).toBeInTheDocument()
      expect(screen.getByText("Videos")).toBeInTheDocument()
      expect(screen.getByText("Storage")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      render(
        <immichDefinition.Widget users={0} photos={0} videos={0} storage={0} />
      )
      expect(screen.getAllByText("0")).toHaveLength(3)
      expect(screen.getByText("0 KB")).toBeInTheDocument()
    })
  })
})
