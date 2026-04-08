import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { apcupsDefinition } from "@/lib/adapters/apcups"

describe("apcups definition", () => {
  it("has correct metadata", () => {
    expect(apcupsDefinition.id).toBe("apcups")
    expect(apcupsDefinition.name).toBe("APC UPS")
    expect(apcupsDefinition.icon).toBe("apc")
    expect(apcupsDefinition.category).toBe("monitoring")
    expect(apcupsDefinition.defaultPollingMs).toBe(15_000)
  })

  it("has configFields defined", () => {
    expect(apcupsDefinition.configFields).toBeDefined()
    expect(apcupsDefinition.configFields).toHaveLength(1)
    expect(apcupsDefinition.configFields[0].key).toBe("url")
    expect(apcupsDefinition.configFields[0].type).toBe("url")
    expect(apcupsDefinition.configFields[0].required).toBe(true)
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("fetches data successfully from HTML", async () => {
      const mockHtml = `
        <table>
          <tr><td>LOADPCT : <span>45.2 Percent</span></td></tr>
          <tr><td>BCHARGE : <span>100.0 Percent</span></td></tr>
          <tr><td>TIMELEFT : <span>35.0 Minutes</span></td></tr>
          <tr><td>ITEMP : <span>32.5 C</span></td></tr>
          <tr><td>STATUS : <span>ONLINE</span></td></tr>
        </table>
      `
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockHtml),
        })
      )

      const result = await apcupsDefinition.fetchData!({
        url: "https://apcups.example.com/",
      })

      expect(result._status).toBe("ok")
      expect(result.loadPercent).toBe(45.2)
      expect(result.batteryCharge).toBe(100)
      expect(result.timeLeft).toBe(35)
      expect(result.temperature).toBe(32.5)
      expect(result.status).toBe("ONLINE")
    })

    it("sets warn status when not ONLINE", async () => {
      const mockHtml = `
        <table>
          <tr><td>STATUS : <span>ONBATT</span></td></tr>
          <tr><td>LOADPCT : <span>0 Percent</span></td></tr>
          <tr><td>BCHARGE : <span>50 Percent</span></td></tr>
          <tr><td>TIMELEFT : <span>10 Minutes</span></td></tr>
          <tr><td>ITEMP : <span>30 C</span></td></tr>
        </table>
      `
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve(mockHtml),
        })
      )

      const result = await apcupsDefinition.fetchData!({
        url: "https://apcups.example.com",
      })

      expect(result._status).toBe("warn")
      expect(result.status).toBe("ONBATT")
    })

    it("throws on error response", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 404 }))

      await expect(
        apcupsDefinition.fetchData!({
          url: "https://apcups.example.com",
        })
      ).rejects.toThrow("APC UPS error: 404")
    })

    it("handles missing values with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          text: () => Promise.resolve("<html></html>"),
        })
      )

      const result = await apcupsDefinition.fetchData!({
        url: "https://apcups.example.com",
      })

      expect(result.loadPercent).toBe(0)
      expect(result.batteryCharge).toBe(0)
      expect(result.timeLeft).toBe(0)
      expect(result.temperature).toBe(0)
      expect(result.status).toBe("Unknown")
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <apcupsDefinition.Widget
          loadPercent={45}
          batteryCharge={100}
          timeLeft={2100}
          temperature={32}
          status="ONLINE"
        />
      )
      expect(screen.getByText("45%")).toBeInTheDocument()
      expect(screen.getByText("100%")).toBeInTheDocument()
      expect(screen.getByText("35m")).toBeInTheDocument()
      expect(screen.getByText("32°C")).toBeInTheDocument()
      expect(screen.getByText("ONLINE")).toBeInTheDocument()
    })

    it("shows seconds when time left is under 60", () => {
      render(
        <apcupsDefinition.Widget
          loadPercent={80}
          batteryCharge={10}
          timeLeft={30}
          temperature={35}
          status="ONBATT"
        />
      )
      expect(screen.getByText("30s")).toBeInTheDocument()
    })
  })
})
