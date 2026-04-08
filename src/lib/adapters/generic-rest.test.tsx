import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { genericRestDefinition } from "@/lib/adapters/generic-rest"

describe("generic-rest definition", () => {
  it("has correct metadata", () => {
    expect(genericRestDefinition.id).toBe("generic-rest")
    expect(genericRestDefinition.name).toBe("Generic REST")
    expect(genericRestDefinition.icon).toBe("network")
    expect(genericRestDefinition.category).toBe("monitoring")
    expect(genericRestDefinition.defaultPollingMs).toBe(30_000)
  })

  it("has configFields defined", () => {
    expect(genericRestDefinition.configFields).toBeDefined()
    expect(genericRestDefinition.configFields).toHaveLength(5)
    expect(genericRestDefinition.configFields[0].key).toBe("url")
    expect(genericRestDefinition.configFields[0].type).toBe("url")
    expect(genericRestDefinition.configFields[0].required).toBe(true)
    expect(genericRestDefinition.configFields[1].key).toBe("method")
    expect(genericRestDefinition.configFields[1].type).toBe("select")
    expect(genericRestDefinition.configFields[2].key).toBe("jsonPath")
    expect(genericRestDefinition.configFields[2].type).toBe("text")
    expect(genericRestDefinition.configFields[3].key).toBe("label")
    expect(genericRestDefinition.configFields[3].type).toBe("text")
    expect(genericRestDefinition.configFields[4].key).toBe("apiKey")
    expect(genericRestDefinition.configFields[4].type).toBe("password")
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("fetches data successfully", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: "healthy", version: "1.0" }),
        })
      )

      const result = await genericRestDefinition.fetchData!({
        url: "https://api.example.com/status",
      })

      expect(result._status).toBe("ok")
      expect(result.value).toBe("OK")
      expect(result.label).toBe("Value")
    })

    it("extracts value using jsonPath", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              data: { status: "running", count: 42 },
            }),
        })
      )

      const result = await genericRestDefinition.fetchData!({
        url: "https://api.example.com/status",
        jsonPath: "data.status",
        label: "Service Status",
      })

      expect(result._status).toBe("ok")
      expect(result.value).toBe("running")
      expect(result.label).toBe("Service Status")
    })

    it("handles nested jsonPath", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              a: { b: { c: "deep-value" } },
            }),
        })
      )

      const result = await genericRestDefinition.fetchData!({
        url: "https://api.example.com/status",
        jsonPath: "a.b.c",
      })

      expect(result.value).toBe("deep-value")
    })

    it("returns N/A for invalid jsonPath", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({ status: "ok" }),
        })
      )

      const result = await genericRestDefinition.fetchData!({
        url: "https://api.example.com/status",
        jsonPath: "data.missing.field",
      })

      expect(result.value).toBe("N/A")
    })

    it("returns error status on HTTP failure", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 500 }))

      const result = await genericRestDefinition.fetchData!({
        url: "https://api.example.com/status",
      })

      expect(result._status).toBe("error")
      expect(result.value).toBe("Error")
      expect(result._statusText).toBe("HTTP 500")
    })

    it("returns error status on network failure", async () => {
      vi.stubGlobal("fetch", () => Promise.reject(new Error("Network error")))

      const result = await genericRestDefinition.fetchData!({
        url: "https://api.example.com/status",
      })

      expect(result._status).toBe("error")
      expect(result.value).toBe("Error")
      expect(result._statusText).toBe("Network error")
    })

    it("uses POST method when configured", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )
      vi.stubGlobal("fetch", mockFetch)

      await genericRestDefinition.fetchData!({
        url: "https://api.example.com/status",
        method: "POST",
      })

      expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/status", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: "{}",
      })
    })

    it("includes Bearer token when apiKey provided", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )
      vi.stubGlobal("fetch", mockFetch)

      await genericRestDefinition.fetchData!({
        url: "https://api.example.com/status",
        apiKey: "secret-token",
      })

      expect(mockFetch).toHaveBeenCalledWith("https://api.example.com/status", {
        method: "GET",
        headers: {
          "Content-Type": "application/json",
          Authorization: "Bearer secret-token",
        },
        body: undefined,
      })
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(<genericRestDefinition.Widget value="healthy" label="Status" />)
      expect(screen.getByText("healthy")).toBeInTheDocument()
      expect(screen.getByText("Status")).toBeInTheDocument()
    })

    it("renders error state", () => {
      render(<genericRestDefinition.Widget value="Error" label="Status" />)
      expect(screen.getByText("Error")).toBeInTheDocument()
      expect(screen.getByText("Status")).toBeInTheDocument()
    })
  })
})
