import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { plexDefinition } from "@/lib/adapters/plex"
import { TooltipProvider } from "@/components/ui/tooltip"

function renderWithTooltipProvider(ui: React.ReactElement) {
  return render(<TooltipProvider>{ui}</TooltipProvider>)
}

describe("plex definition", () => {
  it("has correct metadata", () => {
    expect(plexDefinition.id).toBe("plex")
    expect(plexDefinition.name).toBe("Plex")
    expect(plexDefinition.icon).toBe("plex")
    expect(plexDefinition.category).toBe("media")
    expect(plexDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has configFields defined", () => {
    expect(plexDefinition.configFields).toBeDefined()
    expect(plexDefinition.configFields).toHaveLength(3)
    expect(plexDefinition.configFields[0].key).toBe("url")
    expect(plexDefinition.configFields[0].type).toBe("url")
    expect(plexDefinition.configFields[0].required).toBe(true)
    expect(plexDefinition.configFields[1].key).toBe("token")
    expect(plexDefinition.configFields[1].type).toBe("password")
    expect(plexDefinition.configFields[1].required).toBe(true)
    expect(plexDefinition.configFields[2].key).toBe("showActiveStreams")
    expect(plexDefinition.configFields[2].type).toBe("boolean")
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
        if (url.includes("/status/sessions")) {
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve(
                '<MediaContainer size="2"><Video title="Movie" grandparentTitle="" viewOffset="3600000" duration="7200000"><User title="user1" /><Player state="playing" /></Video></MediaContainer>'
              ),
          })
        }
        if (url.includes("/library/sections") && !url.includes("/all")) {
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve(
                '<MediaContainer><Directory key="1" type="movie" /><Directory key="2" type="show" /></MediaContainer>'
              ),
          })
        }
        if (url.includes("/all")) {
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve(
                '<MediaContainer totalSize="50"><Directory /></MediaContainer>'
              ),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await plexDefinition.fetchData!({
        url: "https://plex.example.com/",
        token: "test-token",
        showActiveStreams: "false",
      })

      expect(result._status).toBe("ok")
      expect(result.streams).toBe(2)
      expect(result.movies).toBe(50)
      expect(result.tvShows).toBe(50)
    })

    it("throws on invalid token", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }))

      await expect(
        plexDefinition.fetchData!({
          url: "https://plex.example.com",
          token: "bad-token",
        })
      ).rejects.toThrow("Invalid Plex token")
    })

    it("throws on not found", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 404 }))

      await expect(
        plexDefinition.fetchData!({
          url: "https://plex.example.com",
          token: "test",
        })
      ).rejects.toThrow("Plex not found at this URL")
    })

    it("handles empty library", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/status/sessions")) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve('<MediaContainer size="0" />'),
          })
        }
        if (url.includes("/library/sections")) {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve("<MediaContainer />"),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await plexDefinition.fetchData!({
        url: "https://plex.example.com",
        token: "test-token",
      })

      expect(result.streams).toBe(0)
      expect(result.movies).toBe(0)
      expect(result.tvShows).toBe(0)
      expect(result.albums).toBe(0)
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      renderWithTooltipProvider(
        <plexDefinition.Widget
          streams={3}
          albums={10}
          movies={50}
          tvShows={20}
          showActiveStreams={false}
        />
      )
      expect(screen.getByText("3")).toBeInTheDocument()
      expect(screen.getByText("10")).toBeInTheDocument()
      expect(screen.getByText("50")).toBeInTheDocument()
      expect(screen.getByText("20")).toBeInTheDocument()
      expect(screen.getByText("Active Streams")).toBeInTheDocument()
      expect(screen.getByText("Albums")).toBeInTheDocument()
      expect(screen.getByText("Movies")).toBeInTheDocument()
      expect(screen.getByText("TV Shows")).toBeInTheDocument()
    })

    it("renders without active streams", () => {
      renderWithTooltipProvider(
        <plexDefinition.Widget
          streams={0}
          albums={0}
          movies={0}
          tvShows={0}
          showActiveStreams={false}
        />
      )
      expect(screen.getAllByText("0")).toHaveLength(4)
    })
  })
})
