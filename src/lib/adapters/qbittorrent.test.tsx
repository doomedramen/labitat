import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { qbittorrentDefinition } from "@/lib/adapters/qbittorrent"
import { TooltipProvider } from "@/components/ui/tooltip"

function renderWithTooltipProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

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

  describe("Widget", () => {
    it("renders with sample data", () => {
      renderWithTooltipProvider(
        <qbittorrentDefinition.Widget
          downSpeed="15.0 MB/s"
          upSpeed="1.0 MB/s"
          activeDownloads={3}
          queued={5}
          downloads={[
            {
              title: "Movie.mkv",
              progress: 50,
              timeLeft: "1:00h",
              activity: "downloading",
              size: "4.7 GB",
            },
          ]}
        />
      )
      expect(screen.getByText("15.0 MB/s")).toBeInTheDocument()
      expect(screen.getByText("1.0 MB/s")).toBeInTheDocument()
      expect(screen.getByText("3")).toBeInTheDocument()
      expect(screen.getByText("5")).toBeInTheDocument()
      expect(screen.getByText("Movie.mkv")).toBeInTheDocument()
    })

    it("renders without downloads", () => {
      renderWithTooltipProvider(
        <qbittorrentDefinition.Widget
          downSpeed="100 KB/s"
          upSpeed="50 KB/s"
          activeDownloads={0}
          queued={0}
        />
      )
      expect(screen.getByText("100 KB/s")).toBeInTheDocument()
      expect(screen.getByText("50 KB/s")).toBeInTheDocument()
      expect(screen.getAllByText("0")).toHaveLength(2)
    })
  })
})
