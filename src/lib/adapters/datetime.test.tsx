import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { datetimeDefinition } from "@/lib/adapters/datetime"

describe("datetime definition", () => {
  it("has correct metadata", () => {
    expect(datetimeDefinition.id).toBe("datetime")
    expect(datetimeDefinition.name).toBe("Date & Time")
    expect(datetimeDefinition.icon).toBe("clock")
    expect(datetimeDefinition.category).toBe("info")
    expect(datetimeDefinition.defaultPollingMs).toBe(1_000)
    expect(datetimeDefinition.clientSide).toBe(true)
  })

  it("has configFields defined", () => {
    expect(datetimeDefinition.configFields).toBeDefined()
    expect(datetimeDefinition.configFields).toHaveLength(2)
    expect(datetimeDefinition.configFields[0].key).toBe("timeZone")
    expect(datetimeDefinition.configFields[0].type).toBe("text")
    expect(datetimeDefinition.configFields[0].required).toBe(false)
    expect(datetimeDefinition.configFields[1].key).toBe("format24h")
    expect(datetimeDefinition.configFields[1].type).toBe("boolean")
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.useFakeTimers()
      vi.setSystemTime(new Date("2024-06-15T14:30:45.000Z"))
    })

    afterEach(() => {
      vi.useRealTimers()
      vi.restoreAllMocks()
    })

    it("returns current time and date", async () => {
      const result = await datetimeDefinition.fetchData!({})

      expect(result._status).toBe("ok")
      expect(result.time).toBeDefined()
      expect(result.date).toBeDefined()
      expect(result.timeZone).toBeDefined()
      expect(result.timeZoneOffset).toBeDefined()
    })

    it("uses 12-hour format by default", async () => {
      const result = await datetimeDefinition.fetchData!({})

      // 12-hour format should contain AM or PM
      expect(result.time).toMatch(/AM|PM/)
    })

    it("uses 24-hour format when configured", async () => {
      const result = await datetimeDefinition.fetchData!({
        format24h: "true",
      })

      // 24-hour format should not contain AM or PM
      expect(result.time).not.toMatch(/AM|PM/)
    })

    it("uses specified timezone", async () => {
      const result = await datetimeDefinition.fetchData!({
        timeZone: "America/New_York",
      })

      expect(result.timeZone).toBeDefined()
      expect(result.timeZoneOffset).toBeDefined()
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <datetimeDefinition.Widget
          time="14:30:45"
          date="Saturday, June 15, 2024"
          timeZone="EST"
          timeZoneOffset="-5"
        />
      )
      expect(screen.getByText("14:30:45")).toBeInTheDocument()
      expect(screen.getByText("Saturday, June 15, 2024")).toBeInTheDocument()
      expect(screen.getByText("EST (UTC-5)")).toBeInTheDocument()
    })

    it("renders with different timezone offset", () => {
      render(
        <datetimeDefinition.Widget
          time="09:00:00"
          date="Monday, January 1, 2024"
          timeZone="GMT"
          timeZoneOffset="+0"
        />
      )
      expect(screen.getByText("09:00:00")).toBeInTheDocument()
      expect(screen.getByText("GMT (UTC+0)")).toBeInTheDocument()
    })
  })
})
