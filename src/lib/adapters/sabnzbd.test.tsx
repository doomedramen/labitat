import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { sabnzbdDefinition } from "@/lib/adapters/sabnzbd"

describe("sabnzbd definition", () => {
  it("has correct metadata", () => {
    expect(sabnzbdDefinition.id).toBe("sabnzbd")
    expect(sabnzbdDefinition.name).toBe("SABnzbd")
    expect(sabnzbdDefinition.icon).toBe("sabnzbd")
    expect(sabnzbdDefinition.category).toBe("downloads")
    expect(sabnzbdDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has configFields defined", () => {
    expect(sabnzbdDefinition.configFields).toBeDefined()
    expect(sabnzbdDefinition.configFields).toHaveLength(2)
    expect(sabnzbdDefinition.configFields[0].key).toBe("url")
    expect(sabnzbdDefinition.configFields[0].type).toBe("url")
    expect(sabnzbdDefinition.configFields[0].required).toBe(true)
    expect(sabnzbdDefinition.configFields[1].key).toBe("apiKey")
    expect(sabnzbdDefinition.configFields[1].type).toBe("password")
    expect(sabnzbdDefinition.configFields[1].required).toBe(true)
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("fetches data successfully while downloading", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              queue: {
                speed: "15.5 MB/s",
                timeleft: "02:30:00",
                noofslots: 5,
                status: "Downloading",
              },
            }),
        })
      )

      const result = await sabnzbdDefinition.fetchData!({
        url: "https://sabnzbd.example.com/",
        apiKey: "test-key",
      })

      expect(result._status).toBe("ok")
      expect(result.speed).toBe("15.5 MB/s")
      expect(result.remaining).toBe("02:30:00")
      expect(result.queueSize).toBe(5)
      expect(result.downloading).toBe(true)
    })

    it("fetches data successfully while idle", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              queue: {
                speed: "0 B/s",
                timeleft: "",
                noofslots: 0,
                status: "Idle",
              },
            }),
        })
      )

      const result = await sabnzbdDefinition.fetchData!({
        url: "https://sabnzbd.example.com",
        apiKey: "test-key",
      })

      expect(result._status).toBe("ok")
      expect(result.speed).toBe("0 B/s")
      expect(result.remaining).toBe("")
      expect(result.queueSize).toBe(0)
      expect(result.downloading).toBe(false)
    })

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 403 }))

      await expect(
        sabnzbdDefinition.fetchData!({
          url: "https://sabnzbd.example.com",
          apiKey: "bad-key",
        })
      ).rejects.toThrow("SABnzbd error: 403")
    })

    it("handles missing data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )

      const result = await sabnzbdDefinition.fetchData!({
        url: "https://sabnzbd.example.com",
        apiKey: "test-key",
      })

      expect(result.speed).toBe("0 B/s")
      expect(result.remaining).toBe("—")
      expect(result.queueSize).toBe(0)
      expect(result.downloading).toBe(false)
    })

    it("includes API key in URL query params", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ queue: {} }),
        })
      )
      vi.stubGlobal("fetch", mockFetch)

      await sabnzbdDefinition.fetchData!({
        url: "https://sabnzbd.example.com",
        apiKey: "secret-key",
      })

      expect(mockFetch).toHaveBeenCalledWith(
        "https://sabnzbd.example.com/api?output=json&apikey=secret-key&mode=queue"
      )
    })
  })

  describe("Widget", () => {
    it("renders downloading state", () => {
      render(
        <sabnzbdDefinition.Widget
          speed="15.5 MB/s"
          remaining="02:30:00"
          queueSize={5}
          downloading={true}
        />
      )
      expect(screen.getByText("15.5 MB/s")).toBeInTheDocument()
      expect(screen.getByText("02:30:00")).toBeInTheDocument()
      expect(screen.getByText("5")).toBeInTheDocument()
      expect(screen.getByText("Speed")).toBeInTheDocument()
      expect(screen.getByText("Left")).toBeInTheDocument()
      expect(screen.getByText("Queue")).toBeInTheDocument()
    })

    it("renders idle state", () => {
      render(
        <sabnzbdDefinition.Widget
          speed="0 B/s"
          remaining="—"
          queueSize={0}
          downloading={false}
        />
      )
      expect(screen.getByText("Idle")).toBeInTheDocument()
      expect(screen.getByText("—")).toBeInTheDocument()
      expect(screen.getByText("0")).toBeInTheDocument()
    })
  })
})
