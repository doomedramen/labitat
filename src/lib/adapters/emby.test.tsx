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
    expect(embyDefinition.configFields).toHaveLength(3)
    expect(embyDefinition.configFields[0].key).toBe("url")
    expect(embyDefinition.configFields[0].type).toBe("url")
    expect(embyDefinition.configFields[0].required).toBe(true)
    expect(embyDefinition.configFields[1].key).toBe("apiKey")
    expect(embyDefinition.configFields[1].type).toBe("password")
    expect(embyDefinition.configFields[1].required).toBe(true)
    expect(embyDefinition.configFields[2].key).toBe("showActiveStreams")
    expect(embyDefinition.configFields[2].type).toBe("boolean")
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
      expect(result.songs).toBe(1000)
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
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({}),
          })
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
                    RunTimeTicks: 36000000000,
                  },
                  PlayState: {
                    IsPaused: false,
                    PositionTicks: 18000000000,
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
        url: "https://emby.example.com",
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
      const payload = embyDefinition.toPayload!({
        _status: "ok",
        activeStreams: 3,
        movies: 150,
        shows: 20,
        episodes: 500,
        songs: 1000,
      })
      expect(payload.stats).toHaveLength(5)
      expect(payload.stats[0].value).toBe("3")
      expect(payload.stats[0].label).toBe("Active Streams")
      expect(payload.stats[1].value).toBe("150")
      expect(payload.stats[1].label).toBe("Movies")
      expect(payload.stats[2].value).toBe("20")
      expect(payload.stats[2].label).toBe("Shows")
      expect(payload.stats[3].value).toBe("500")
      expect(payload.stats[3].label).toBe("Episodes")
      expect(payload.stats[4].value).toBe("1,000")
      expect(payload.stats[4].label).toBe("Songs")
    })

    it("includes streams when enabled", () => {
      const payload = embyDefinition.toPayload!({
        _status: "ok",
        activeStreams: 1,
        movies: 150,
        shows: 20,
        episodes: 500,
        songs: 1000,
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
      const payload = embyDefinition.toPayload!({
        _status: "ok",
        activeStreams: 1,
        movies: 150,
        shows: 20,
        episodes: 500,
        songs: 1000,
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
      const payload = embyDefinition.toPayload!({
        _status: "ok",
        activeStreams: 0,
        movies: 0,
        shows: 0,
        episodes: 0,
        songs: 0,
      })
      expect(payload.stats.every((s) => s.value === "0")).toBe(true)
    })
  })
})
