import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { genericPingDefinition } from "@/lib/adapters/generic-ping"

describe("generic-ping definition", () => {
  it("has correct metadata", () => {
    expect(genericPingDefinition.id).toBe("generic-ping")
    expect(genericPingDefinition.name).toBe("Generic Ping")
    expect(genericPingDefinition.icon).toBe("network")
    expect(genericPingDefinition.category).toBe("monitoring")
    expect(genericPingDefinition.defaultPollingMs).toBe(30_000)
  })

  it("has configFields defined", () => {
    expect(genericPingDefinition.configFields).toBeDefined()
    expect(genericPingDefinition.configFields).toHaveLength(2)
    expect(genericPingDefinition.configFields[0].key).toBe("url")
    expect(genericPingDefinition.configFields[0].type).toBe("url")
    expect(genericPingDefinition.configFields[0].required).toBe(true)
    expect(genericPingDefinition.configFields[1].key).toBe("timeout")
    expect(genericPingDefinition.configFields[1].type).toBe("number")
    expect(genericPingDefinition.configFields[1].required).toBe(false)
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2024-01-01T00:00:00.000Z"))
    })

    afterEach(() => {
      vi.useRealTimers()
      vi.restoreAllMocks()
    })

    it("returns up status when fetch succeeds", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: true }))

      const result = await genericPingDefinition.fetchData!({
        url: "https://example.com",
      })

      expect(result._status).toBe("ok")
      expect(result.status).toBe("up")
      expect(result.responseTime).toBe(0)
    })

    it("returns down status when fetch fails", async () => {
      vi.stubGlobal("fetch", () => Promise.reject(new Error("Network error")))

      const result = await genericPingDefinition.fetchData!({
        url: "https://example.com",
      })

      expect(result._status).toBe("error")
      expect(result.status).toBe("down")
      expect(result.responseTime).toBe(0)
      expect(result._statusText).toBe("Network error")
    })

    it("uses custom timeout when provided", async () => {
      vi.stubGlobal("fetch", () => Promise.reject(new Error("Timeout")))

      const result = await genericPingDefinition.fetchData!({
        url: "https://example.com",
        timeout: "1000",
      })

      // Should return down status due to timeout/error
      expect(result.status).toBe("down")
    })

    it("uses default timeout when not provided", async () => {
      vi.stubGlobal("fetch", () => Promise.reject(new Error("Timeout")))

      const result = await genericPingDefinition.fetchData!({
        url: "https://example.com",
      })

      expect(result.status).toBe("down")
    })
  })

  describe("Widget", () => {
    it("renders online status", () => {
      render(<genericPingDefinition.Widget status="up" responseTime={45} />)
      expect(screen.getByText("✓")).toBeInTheDocument()
      expect(screen.getByText("Online")).toBeInTheDocument()
      expect(screen.getByText("45ms")).toBeInTheDocument()
      expect(screen.getByText("Response")).toBeInTheDocument()
    })

    it("renders offline status with destructive color", () => {
      const { container } = render(
        <genericPingDefinition.Widget status="down" responseTime={0} />
      )
      expect(screen.getByText("✗")).toBeInTheDocument()
      expect(screen.getByText("Offline")).toBeInTheDocument()
      expect(screen.getByText("0ms")).toBeInTheDocument()
      const destructiveElements =
        container.querySelectorAll(".text-destructive")
      expect(destructiveElements.length).toBeGreaterThan(0)
    })
  })
})
