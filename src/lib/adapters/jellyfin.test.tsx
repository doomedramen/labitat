import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { jellyfinDefinition } from "@/lib/adapters/jellyfin"

describe("jellyfin definition", () => {
  it("has correct metadata", () => {
    expect(jellyfinDefinition.id).toBe("jellyfin")
    expect(jellyfinDefinition.name).toBe("Jellyfin")
    expect(jellyfinDefinition.icon).toBe("jellyfin")
    expect(jellyfinDefinition.category).toBe("media")
    expect(jellyfinDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has configFields defined", () => {
    expect(jellyfinDefinition.configFields).toBeDefined()
    expect(jellyfinDefinition.configFields).toHaveLength(3)
    expect(jellyfinDefinition.configFields[0].key).toBe("url")
    expect(jellyfinDefinition.configFields[0].type).toBe("url")
    expect(jellyfinDefinition.configFields[0].required).toBe(true)
    expect(jellyfinDefinition.configFields[1].key).toBe("apiKey")
    expect(jellyfinDefinition.configFields[1].type).toBe("password")
    expect(jellyfinDefinition.configFields[1].required).toBe(true)
    expect(jellyfinDefinition.configFields[2].key).toBe("version")
    expect(jellyfinDefinition.configFields[2].type).toBe("select")
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
              ]),
          })
        }
        if (url.includes("/Items/Counts")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                MovieCount: 100,
                SeriesCount: 15,
                EpisodeCount: 300,
                SongCount: 500,
              }),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await jellyfinDefinition.fetchData!({
        url: "https://jellyfin.example.com/",
        apiKey: "test-key",
        version: "2",
      })

      expect(result._status).toBe("ok")
      expect(result.activeStreams).toBe(1)
      expect(result.movies).toBe(100)
      expect(result.shows).toBe(15)
      expect(result.episodes).toBe(300)
    })

    it("throws on invalid API key", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }))

      await expect(
        jellyfinDefinition.fetchData!({
          url: "https://jellyfin.example.com",
          apiKey: "bad-key",
        })
      ).rejects.toThrow("Invalid API key")
    })

    it("throws on not found", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 404 }))

      await expect(
        jellyfinDefinition.fetchData!({
          url: "https://jellyfin.example.com",
          apiKey: "test-key",
        })
      ).rejects.toThrow("Jellyfin not found at this URL")
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

      const result = await jellyfinDefinition.fetchData!({
        url: "https://jellyfin.example.com",
        apiKey: "test-key",
      })

      expect(result.activeStreams).toBe(0)
      expect(result.movies).toBe(0)
      expect(result.shows).toBe(0)
      expect(result.episodes).toBe(0)
    })
  })

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = jellyfinDefinition.toPayload!({
        _status: "ok",
        activeStreams: 3,
        movies: 100,
        shows: 15,
        episodes: 300,
      })
      expect(payload.stats).toHaveLength(4)
      expect(payload.stats[0].value).toBe(3)
      expect(payload.stats[0].label).toBe("Active Streams")
      expect(payload.stats[1].value).toBe(100)
      expect(payload.stats[1].label).toBe("Movies")
      expect(payload.stats[2].value).toBe(15)
      expect(payload.stats[2].label).toBe("Shows")
      expect(payload.stats[3].value).toBe(300)
      expect(payload.stats[3].label).toBe("Episodes")
    })

    it("handles zero values", () => {
      const payload = jellyfinDefinition.toPayload!({
        _status: "ok",
        activeStreams: 0,
        movies: 0,
        shows: 0,
        episodes: 0,
      })
      expect(payload.stats.every((s) => s.value === 0)).toBe(true)
    })
  })
})
