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
    expect(jellyfinDefinition.configFields[2].key).toBe("showActiveStreams")
    expect(jellyfinDefinition.configFields[2].type).toBe("boolean")
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
      })

      expect(result._status).toBe("ok")
      expect(result.activeStreams).toBe(1)
      expect(result.movies).toBe(100)
      expect(result.shows).toBe(15)
      expect(result.episodes).toBe(300)
      expect(result.songs).toBe(500)
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
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          })
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
      expect(result.songs).toBe(0)
    })

    it("fetches active streams when enabled", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/Sessions")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  Id: "session-1",
                  UserName: "TestUser",
                  NowPlayingItem: {
                    Name: "Test Episode",
                    SeriesName: "Test Series",
                    Type: "Episode",
                    ParentIndexNumber: 1,
                    IndexNumber: 5,
                    RunTimeTicks: 36000000000, // 1 hour in ticks
                  },
                  PlayState: {
                    IsPaused: false,
                    PositionTicks: 18000000000, // 30 minutes
                  },
                  TranscodingInfo: {
                    IsVideoDirect: true,
                  },
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
        url: "https://jellyfin.example.com",
        apiKey: "test-key",
        showActiveStreams: "true",
      })

      expect(result.showActiveStreams).toBe(true)
      expect(result.sessions).toHaveLength(1)
      expect(result.sessions![0].title).toBe("S01E05 - Test Episode")
      expect(result.sessions![0].subtitle).toBe("Test Series")
      expect(result.sessions![0].user).toBe("TestUser")
      expect(result.sessions![0].state).toBe("playing")
      expect(result.sessions![0].streamId).toBe("session-1")
      expect(result.sessions![0].transcoding?.isDirect).toBe(true)
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
        songs: 500,
      })
      expect(payload.stats).toHaveLength(5)
      expect(payload.stats[0].value).toBe(3)
      expect(payload.stats[0].label).toBe("Active Streams")
      expect(payload.stats[1].value).toBe(100)
      expect(payload.stats[1].label).toBe("Movies")
      expect(payload.stats[2].value).toBe(15)
      expect(payload.stats[2].label).toBe("Shows")
      expect(payload.stats[3].value).toBe(300)
      expect(payload.stats[3].label).toBe("Episodes")
      expect(payload.stats[4].value).toBe(500)
      expect(payload.stats[4].label).toBe("Songs")
    })

    it("includes streams when enabled", () => {
      const payload = jellyfinDefinition.toPayload!({
        _status: "ok",
        activeStreams: 1,
        movies: 100,
        shows: 15,
        episodes: 300,
        songs: 500,
        showActiveStreams: true,
        sessions: [
          {
            title: "Test Episode",
            subtitle: "Test Series",
            user: "TestUser",
            progress: 1800,
            duration: 3600,
            state: "playing",
            streamId: "session-1",
          },
        ],
      })
      expect(payload.streams).toHaveLength(1)
      expect(payload.streams![0].title).toBe("Test Episode")
    })

    it("excludes streams when disabled", () => {
      const payload = jellyfinDefinition.toPayload!({
        _status: "ok",
        activeStreams: 1,
        movies: 100,
        shows: 15,
        episodes: 300,
        songs: 500,
        showActiveStreams: false,
        sessions: [
          {
            title: "Test Episode",
            user: "TestUser",
            progress: 1800,
            duration: 3600,
          },
        ],
      })
      expect(payload.streams).toBeUndefined()
    })

    it("handles zero values", () => {
      const payload = jellyfinDefinition.toPayload!({
        _status: "ok",
        activeStreams: 0,
        movies: 0,
        shows: 0,
        episodes: 0,
        songs: 0,
      })
      expect(payload.stats.every((s) => s.value === 0)).toBe(true)
    })
  })
})
