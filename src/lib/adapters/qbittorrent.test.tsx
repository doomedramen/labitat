import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { qbittorrentDefinition } from "@/lib/adapters/qbittorrent"

describe("qbittorrent definition", () => {
  it("has correct metadata", () => {
    expect(qbittorrentDefinition.id).toBe("qbittorrent")
    expect(qbittorrentDefinition.name).toBe("qBittorrent")
    expect(qbittorrentDefinition.icon).toBe("qbittorrent")
    expect(qbittorrentDefinition.category).toBe("downloads")
    expect(qbittorrentDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has configFields defined", () => {
    expect(qbittorrentDefinition.configFields).toBeDefined()
    expect(qbittorrentDefinition.configFields).toHaveLength(3)
    expect(qbittorrentDefinition.configFields[0].key).toBe("url")
    expect(qbittorrentDefinition.configFields[0].type).toBe("url")
    expect(qbittorrentDefinition.configFields[0].required).toBe(true)
    expect(qbittorrentDefinition.configFields[1].key).toBe("username")
    expect(qbittorrentDefinition.configFields[1].type).toBe("text")
    expect(qbittorrentDefinition.configFields[1].required).toBe(true)
    expect(qbittorrentDefinition.configFields[2].key).toBe("password")
    expect(qbittorrentDefinition.configFields[2].type).toBe("password")
    expect(qbittorrentDefinition.configFields[2].required).toBe(true)
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
        if (url.includes("/auth/login")) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve("Ok."),
            headers: {
              getSetCookie: () => ["SID=abc123"],
            },
          })
        }
        if (url.includes("/transfer/info")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve({
                dl_info_speed: 15728640,
                up_info_speed: 1048576,
              }),
          })
        }
        if (url.includes("/torrents/info?filter=downloading")) {
          return Promise.resolve({
            ok: true,
            json: () =>
              Promise.resolve([
                {
                  name: "Movie.mkv",
                  progress: 0.5,
                  eta: 3600,
                  dlspeed: 10000000,
                  size: 5000000000,
                },
              ]),
          })
        }
        if (url.includes("/torrents/info?filter=queuedDL")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([{ id: 1 }, { id: 2 }]),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await qbittorrentDefinition.fetchData!({
        url: "https://qb.example.com/",
        username: "admin",
        password: "secret",
        showDownloads: "true",
      })

      expect(result._status).toBe("ok")
      expect(result.downSpeed).toBe("15.0 MB/s")
      expect(result.upSpeed).toBe("1.0 MB/s")
      expect(result.activeDownloads).toBe(1)
      expect(result.queued).toBe(2)
      expect(result.downloads).toHaveLength(1)
      expect(result.downloads?.[0].title).toBe("Movie.mkv")
    })

    it("throws on login failure", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 403 }))

      await expect(
        qbittorrentDefinition.fetchData!({
          url: "https://qb.example.com",
          username: "admin",
          password: "wrong",
        })
      ).rejects.toThrow("qBittorrent login failed: 403")
    })

    it("throws on invalid credentials (200 with Fails. body)", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve("Fails."),
          headers: { getSetCookie: () => [] },
        })
      )

      await expect(
        qbittorrentDefinition.fetchData!({
          url: "https://qb.example.com",
          username: "admin",
          password: "wrong",
        })
      ).rejects.toThrow("qBittorrent login failed: invalid credentials")
    })

    it("throws on API error after login", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/auth/login")) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve("Ok."),
            headers: { getSetCookie: () => ["SID=abc123"] },
          })
        }
        return Promise.resolve({ ok: false, status: 500 })
      })
      vi.stubGlobal("fetch", mockFetch)

      await expect(
        qbittorrentDefinition.fetchData!({
          url: "https://qb.example.com",
          username: "admin",
          password: "secret",
        })
      ).rejects.toThrow("qBittorrent error: 500")
    })

    it("handles empty torrent list", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/auth/login")) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve("Ok."),
            headers: { getSetCookie: () => ["SID=abc123"] },
          })
        }
        if (url.includes("/transfer/info")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve({ dl_info_speed: 0, up_info_speed: 0 }),
          })
        }
        if (url.includes("/torrents/info")) {
          return Promise.resolve({
            ok: true,
            json: () => Promise.resolve([]),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await qbittorrentDefinition.fetchData!({
        url: "https://qb.example.com",
        username: "admin",
        password: "secret",
      })

      expect(result.activeDownloads).toBe(0)
      expect(result.queued).toBe(0)
      expect(result.downloads).toEqual([])
    })
  })

  describe("toPayload", () => {
    it("converts data to payload with stats", () => {
      const payload = qbittorrentDefinition.toPayload!({
        _status: "ok",
        downSpeed: "15.0 MB/s",
        upSpeed: "1.0 MB/s",
        activeDownloads: 3,
        queued: 5,
      })
      expect(payload.stats).toHaveLength(4)
      expect(payload.stats[0].value).toBe("15.0 MB/s")
      expect(payload.stats[0].label).toBe("Down")
      expect(payload.stats[1].value).toBe("1.0 MB/s")
      expect(payload.stats[1].label).toBe("Up")
      expect(payload.stats[2].value).toBe(3)
      expect(payload.stats[2].label).toBe("Active")
      expect(payload.stats[3].value).toBe(5)
      expect(payload.stats[3].label).toBe("Queued")
    })

    it("includes downloads when present", () => {
      const payload = qbittorrentDefinition.toPayload!({
        _status: "ok",
        downSpeed: "10 MB/s",
        upSpeed: "1 MB/s",
        activeDownloads: 1,
        queued: 0,
        downloads: [{ title: "Movie.mkv", progress: 50 }],
      })
      expect(payload.downloads).toHaveLength(1)
    })

    it("excludes downloads when empty", () => {
      const payload = qbittorrentDefinition.toPayload!({
        _status: "ok",
        downSpeed: "0 B/s",
        upSpeed: "0 B/s",
        activeDownloads: 0,
        queued: 0,
      })
      expect(payload.downloads).toBeUndefined()
    })
  })
})
