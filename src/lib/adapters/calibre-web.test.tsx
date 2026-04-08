import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { calibreWebDefinition } from "@/lib/adapters/calibre-web"

describe("calibre-web definition", () => {
  it("has correct metadata", () => {
    expect(calibreWebDefinition.id).toBe("calibre-web")
    expect(calibreWebDefinition.name).toBe("Calibre-Web")
    expect(calibreWebDefinition.icon).toBe("calibre-web")
    expect(calibreWebDefinition.category).toBe("productivity")
    expect(calibreWebDefinition.defaultPollingMs).toBe(30_000)
  })

  it("has configFields defined", () => {
    expect(calibreWebDefinition.configFields).toBeDefined()
    expect(calibreWebDefinition.configFields).toHaveLength(3)
    expect(calibreWebDefinition.configFields[0].key).toBe("url")
    expect(calibreWebDefinition.configFields[0].type).toBe("url")
    expect(calibreWebDefinition.configFields[0].required).toBe(true)
    expect(calibreWebDefinition.configFields[1].key).toBe("username")
    expect(calibreWebDefinition.configFields[1].type).toBe("text")
    expect(calibreWebDefinition.configFields[1].required).toBe(true)
    expect(calibreWebDefinition.configFields[2].key).toBe("password")
    expect(calibreWebDefinition.configFields[2].type).toBe("password")
    expect(calibreWebDefinition.configFields[2].required).toBe(true)
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
        if (url.includes("/login")) {
          return Promise.resolve({
            ok: true,
            headers: { getSetCookie: () => ["session=abc123"] },
          })
        }
        if (url === "https://calibre.example.com/") {
          return Promise.resolve({
            ok: true,
            text: () =>
              Promise.resolve("Books: 150 Authors: 45 Series: 20 Formats: 300"),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await calibreWebDefinition.fetchData!({
        url: "https://calibre.example.com/",
        username: "admin",
        password: "secret",
      })

      expect(result._status).toBe("ok")
      expect(result.books).toBe(150)
      expect(result.authors).toBe(45)
      expect(result.series).toBe(20)
      expect(result.formats).toBe(300)
    })

    it("throws on API error after login", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/login")) {
          return Promise.resolve({
            ok: true,
            headers: { getSetCookie: () => ["session=abc123"] },
          })
        }
        return Promise.resolve({ ok: false, status: 500 })
      })
      vi.stubGlobal("fetch", mockFetch)

      await expect(
        calibreWebDefinition.fetchData!({
          url: "https://calibre.example.com",
          username: "admin",
          password: "secret",
        })
      ).rejects.toThrow("Calibre-Web error: 500")
    })

    it("handles missing stats with defaults", async () => {
      const mockFetch = vi.fn((url: string) => {
        if (url.includes("/login")) {
          return Promise.resolve({
            ok: true,
            headers: { getSetCookie: () => ["session=abc123"] },
          })
        }
        if (url === "https://calibre.example.com/") {
          return Promise.resolve({
            ok: true,
            text: () => Promise.resolve("No stats available"),
          })
        }
        return Promise.reject(new Error("Unexpected URL"))
      })
      vi.stubGlobal("fetch", mockFetch)

      const result = await calibreWebDefinition.fetchData!({
        url: "https://calibre.example.com",
        username: "admin",
        password: "secret",
      })

      expect(result.books).toBe(0)
      expect(result.authors).toBe(0)
      expect(result.series).toBe(0)
      expect(result.formats).toBe(0)
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <calibreWebDefinition.Widget
          books={150}
          authors={45}
          series={20}
          formats={300}
        />
      )
      expect(screen.getByText("150")).toBeInTheDocument()
      expect(screen.getByText("45")).toBeInTheDocument()
      expect(screen.getByText("20")).toBeInTheDocument()
      expect(screen.getByText("300")).toBeInTheDocument()
      expect(screen.getByText("Books")).toBeInTheDocument()
      expect(screen.getByText("Authors")).toBeInTheDocument()
      expect(screen.getByText("Series")).toBeInTheDocument()
      expect(screen.getByText("Formats")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      render(
        <calibreWebDefinition.Widget
          books={0}
          authors={0}
          series={0}
          formats={0}
        />
      )
      expect(screen.getAllByText("0")).toHaveLength(4)
    })
  })
})
