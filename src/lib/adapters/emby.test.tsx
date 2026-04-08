import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { embyDefinition } from "@/lib/adapters/emby"

describe("emby definition", () => {
  it("has correct metadata", () => {
    expect(embyDefinition.id).toBe("emby")
    expect(embyDefinition.name).toBe("Emby")
    expect(embyDefinition.icon).toBe("emby")
    expect(embyDefinition.category).toBe("media")
    expect(embyDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has configFields defined", () => {
    expect(embyDefinition.configFields).toBeDefined()
    expect(embyDefinition.configFields).toHaveLength(2)
    expect(embyDefinition.configFields[0].key).toBe("url")
    expect(embyDefinition.configFields[0].type).toBe("url")
    expect(embyDefinition.configFields[0].required).toBe(true)
    expect(embyDefinition.configFields[1].key).toBe("apiKey")
    expect(embyDefinition.configFields[1].type).toBe("password")
    expect(embyDefinition.configFields[1].required).toBe(true)
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
        if (url.includes("/Sessions")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  NowPlayingItem: { Name: "Movie" },
                  PlayState: { IsPaused: false },
                },
                {
                  NowPlayingItem: { Name: "Show" },
                  PlayState: { IsPaused: true },
                },
                {
                  NowPlayingItem: { Name: "Movie2" },
                  PlayState: { IsPaused: false },
                },
              ]),
          })
        }
        if (url.includes("/Items/Counts")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                MovieCount: 150,
                SeriesCount: 20,
                EpisodeCount: 500,
                SongCount: 1000,
              }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await embyDefinition.fetchData!({
        url: "https://emby.example.com/",
        apiKey: "test-key",
      })

      expect(result._status).toBe("ok")
      expect(result.activeStreams).toBe(2)
      expect(result.movies).toBe(150)
      expect(result.shows).toBe(20)
      expect(result.episodes).toBe(500)
    })

    it("throws on invalid API key", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }))

      await expect(
        embyDefinition.fetchData!({
          url: "https://emby.example.com",
          apiKey: "bad-key",
        })
      ).rejects.toThrow("Invalid API key")
    })

    it("throws on not found", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 404 }))

      await expect(
        embyDefinition.fetchData!({
          url: "https://emby.example.com",
          apiKey: "test-key",
        })
      ).rejects.toThrow("Emby not found at this URL")
    })

    it("handles missing counts gracefully", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/Sessions")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          })
        }
        if (url.includes("/Items/Counts")) {
          return Promise.resolve({ ok: false, status: 500 })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await embyDefinition.fetchData!({
        url: "https://emby.example.com",
        apiKey: "test-key",
      })

      expect(result.activeStreams).toBe(0)
      expect(result.movies).toBe(0)
      expect(result.shows).toBe(0)
      expect(result.episodes).toBe(0)
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <embyDefinition.Widget
          activeStreams={3}
          movies={150}
          shows={20}
          episodes={500}
        />
      )
      expect(screen.getByText("3")).toBeInTheDocument()
      expect(screen.getByText("150")).toBeInTheDocument()
      expect(screen.getByText("20")).toBeInTheDocument()
      expect(screen.getByText("500")).toBeInTheDocument()
      expect(screen.getByText("Active Streams")).toBeInTheDocument()
      expect(screen.getByText("Movies")).toBeInTheDocument()
      expect(screen.getByText("Shows")).toBeInTheDocument()
      expect(screen.getByText("Episodes")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      render(
        <embyDefinition.Widget
          activeStreams={0}
          movies={0}
          shows={0}
          episodes={0}
        />
      )
      expect(screen.getAllByText("0")).toHaveLength(4)
    })
  })
})
