import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { transmissionDefinition } from "@/lib/adapters/transmission"
import { TooltipProvider } from "@/components/ui/tooltip"

function renderWithTooltipProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

describe("transmission definition", () => {
  it("has correct metadata", () => {
    expect(transmissionDefinition.id).toBe("transmission")
    expect(transmissionDefinition.name).toBe("Transmission")
    expect(transmissionDefinition.icon).toBe("transmission")
    expect(transmissionDefinition.category).toBe("downloads")
    expect(transmissionDefinition.defaultPollingMs).toBe(5_000)
  })

  it("has configFields defined", () => {
    expect(transmissionDefinition.configFields).toBeDefined()
    expect(transmissionDefinition.configFields).toHaveLength(4)
    expect(transmissionDefinition.configFields[0].key).toBe("url")
    expect(transmissionDefinition.configFields[0].type).toBe("url")
    expect(transmissionDefinition.configFields[0].required).toBe(true)
    expect(transmissionDefinition.configFields[1].key).toBe("username")
    expect(transmissionDefinition.configFields[1].type).toBe("text")
    expect(transmissionDefinition.configFields[1].required).toBe(true)
    expect(transmissionDefinition.configFields[2].key).toBe("password")
    expect(transmissionDefinition.configFields[2].type).toBe("password")
    expect(transmissionDefinition.configFields[2].required).toBe(true)
    expect(transmissionDefinition.configFields[3].key).toBe("rpcUrl")
    expect(transmissionDefinition.configFields[3].type).toBe("text")
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("fetches data successfully", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          headers: { get: () => "csrf-token-123" },
          json: () =>
            Promise.resolve({
              arguments: {
                torrents: [
                  { percentDone: 1, rateDownload: 1000000, rateUpload: 500000 },
                  {
                    percentDone: 0.5,
                    rateDownload: 2000000,
                    rateUpload: 100000,
                  },
                  { percentDone: 1, rateDownload: 0, rateUpload: 200000 },
                ],
              },
            }),
        })
      )
      vi.stubGlobal("fetch", mockFetch)

      const result = await transmissionDefinition.fetchData!({
        url: "https://transmission.example.com/",
        username: "admin",
        password: "secret",
      })

      expect(result._status).toBe("ok")
      expect(result.leech).toBe(1)
      expect(result.seed).toBe(2)
      expect(result.download).toBe(3000000)
      expect(result.upload).toBe(800000)
    })

    it("throws on invalid credentials", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }))

      await expect(
        transmissionDefinition.fetchData!({
          url: "https://transmission.example.com",
          username: "admin",
          password: "wrong",
        })
      ).rejects.toThrow("Invalid username or password")
    })

    it("throws on not found", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 404 }))

      await expect(
        transmissionDefinition.fetchData!({
          url: "https://transmission.example.com",
          username: "admin",
          password: "secret",
        })
      ).rejects.toThrow("Transmission not found at this URL")
    })

    it("handles empty torrent list", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          headers: { get: () => "csrf-token" },
          json: () => Promise.resolve({ arguments: { torrents: [] } }),
        })
      )

      const result = await transmissionDefinition.fetchData!({
        url: "https://transmission.example.com",
        username: "admin",
        password: "secret",
      })

      expect(result.leech).toBe(0)
      expect(result.seed).toBe(0)
      expect(result.download).toBe(0)
      expect(result.upload).toBe(0)
    })

    it("builds download list for active torrents", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          headers: { get: () => "csrf-token" },
          json: () =>
            Promise.resolve({
              arguments: {
                torrents: [
                  {
                    name: "Movie.mkv",
                    percentDone: 0.5,
                    rateDownload: 1000000,
                    rateUpload: 0,
                    sizeWhenDone: 5000000000,
                    left: 2500000000,
                    eta: 3600,
                  },
                  {
                    name: "Complete.mkv",
                    percentDone: 1,
                    rateDownload: 0,
                    rateUpload: 0,
                    sizeWhenDone: 3000000000,
                    left: 0,
                    eta: 0,
                  },
                ],
              },
            }),
        })
      )

      const result = await transmissionDefinition.fetchData!({
        url: "https://transmission.example.com",
        username: "admin",
        password: "secret",
      })

      expect(result.downloads).toHaveLength(1)
      expect(result.downloads?.[0].title).toBe("Movie.mkv")
      expect(result.downloads?.[0].progress).toBe(50)
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      renderWithTooltipProvider(
        <transmissionDefinition.Widget
          leech={3}
          download={5000000}
          seed={10}
          upload={1000000}
        />
      )
      expect(screen.getByText("3")).toBeInTheDocument()
      expect(screen.getByText("10")).toBeInTheDocument()
      expect(screen.getByText("Leech")).toBeInTheDocument()
      expect(screen.getByText("Seed")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      renderWithTooltipProvider(
        <transmissionDefinition.Widget
          leech={0}
          download={0}
          seed={0}
          upload={0}
        />
      )
      expect(screen.getAllByText("0")).toHaveLength(2)
    })
  })
})
