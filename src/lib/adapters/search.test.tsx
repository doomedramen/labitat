import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { searchDefinition } from "@/lib/adapters/search"

describe("search definition", () => {
  it("has correct metadata", () => {
    expect(searchDefinition.id).toBe("search")
    expect(searchDefinition.name).toBe("Search")
    expect(searchDefinition.icon).toBe("search")
    expect(searchDefinition.category).toBe("info")
  })

  it("has configFields defined", () => {
    expect(searchDefinition.configFields).toBeDefined()
    expect(searchDefinition.configFields).toHaveLength(1)
    expect(searchDefinition.configFields[0].key).toBe("engines")
    expect(searchDefinition.configFields[0].type).toBe("text")
    expect(searchDefinition.configFields[0].required).toBe(false)
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("returns default engines when not provided", async () => {
      const result = await searchDefinition.fetchData!({})

      expect(result._status).toBe("ok")
      expect(result.engines).toBe("Google,DuckDuckGo,Bing")
    })

    it("uses provided engines", async () => {
      const result = await searchDefinition.fetchData!({
        engines: "SearXNG,Startpage",
      })

      expect(result._status).toBe("ok")
      expect(result.engines).toBe("SearXNG,Startpage")
    })
  })

  describe("Widget", () => {
    it("renders with default engines", () => {
      render(<searchDefinition.Widget engines="Google,DuckDuckGo,Bing" />)
      expect(screen.getByText("Google")).toBeInTheDocument()
      expect(screen.getByText("DuckDuckGo")).toBeInTheDocument()
      expect(screen.getByText("Bing")).toBeInTheDocument()
    })

    it("renders custom engines", () => {
      render(<searchDefinition.Widget engines="SearXNG,Startpage" />)
      expect(screen.getByText("SearXNG")).toBeInTheDocument()
      expect(screen.getByText("Startpage")).toBeInTheDocument()
    })

    it("creates links for each engine", () => {
      render(<searchDefinition.Widget engines="Google" />)
      const link = screen.getByText("Google")
      expect(link).toHaveAttribute("href")
      expect(link).toHaveAttribute("target", "_blank")
      expect(link).toHaveAttribute("rel", "noopener noreferrer")
    })

    it("trims whitespace from engine names", () => {
      render(<searchDefinition.Widget engines=" Google , DuckDuckGo " />)
      expect(screen.getByText("Google")).toBeInTheDocument()
      expect(screen.getByText("DuckDuckGo")).toBeInTheDocument()
    })
  })
})
