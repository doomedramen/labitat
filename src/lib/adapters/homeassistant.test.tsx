import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { homeassistantDefinition } from "@/lib/adapters/homeassistant"

describe("homeassistant definition", () => {
  it("has correct metadata", () => {
    expect(homeassistantDefinition.id).toBe("homeassistant")
    expect(homeassistantDefinition.name).toBe("Home Assistant")
    expect(homeassistantDefinition.icon).toBe("home-assistant")
    expect(homeassistantDefinition.category).toBe("automation")
    expect(homeassistantDefinition.defaultPollingMs).toBe(30_000)
  })

  it("has configFields defined", () => {
    expect(homeassistantDefinition.configFields).toBeDefined()
    expect(homeassistantDefinition.configFields).toHaveLength(2)
    expect(homeassistantDefinition.configFields[0].key).toBe("url")
    expect(homeassistantDefinition.configFields[0].type).toBe("url")
    expect(homeassistantDefinition.configFields[0].required).toBe(true)
    expect(homeassistantDefinition.configFields[1].key).toBe("token")
    expect(homeassistantDefinition.configFields[1].type).toBe("password")
    expect(homeassistantDefinition.configFields[1].required).toBe(true)
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
          json: () =>
            Promise.resolve([
              { entity_id: "sensor.temperature" },
              { entity_id: "sensor.humidity" },
              { entity_id: "light.living_room" },
              { entity_id: "light.bedroom" },
              { entity_id: "switch.garage" },
              { entity_id: "binary_sensor.door" },
            ]),
        })
      )

      const result = await homeassistantDefinition.fetchData!({
        url: "https://hass.example.com/",
        token: "test-token",
      })

      expect(result._status).toBe("ok")
      expect(result.entities).toBe(6)
      expect(result.sensors).toBe(2)
      expect(result.lights).toBe(2)
      expect(result.switches).toBe(1)
    })

    it("throws on invalid token", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 401 }))

      await expect(
        homeassistantDefinition.fetchData!({
          url: "https://hass.example.com",
          token: "bad-token",
        })
      ).rejects.toThrow("Invalid access token")
    })

    it("throws on not found", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 404 }))

      await expect(
        homeassistantDefinition.fetchData!({
          url: "https://hass.example.com",
          token: "test-token",
        })
      ).rejects.toThrow("Home Assistant not found at this URL")
    })

    it("handles empty entity list", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      )

      const result = await homeassistantDefinition.fetchData!({
        url: "https://hass.example.com",
        token: "test-token",
      })

      expect(result.entities).toBe(0)
      expect(result.sensors).toBe(0)
      expect(result.lights).toBe(0)
      expect(result.switches).toBe(0)
    })

    it("uses Bearer token in Authorization header", async () => {
      const mockFetch = vi.fn(() =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve([]),
        })
      )
      vi.stubGlobal("fetch", mockFetch)

      await homeassistantDefinition.fetchData!({
        url: "https://hass.example.com",
        token: "my-secret-token",
      })

      expect(mockFetch).toHaveBeenCalledWith(
        "https://hass.example.com/api/states",
        {
          headers: {
            Authorization: "Bearer my-secret-token",
            "Content-Type": "application/json",
          },
        }
      )
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <homeassistantDefinition.Widget
          entities={150}
          sensors={50}
          lights={20}
          switches={15}
        />
      )
      expect(screen.getByText("150")).toBeInTheDocument()
      expect(screen.getByText("50")).toBeInTheDocument()
      expect(screen.getByText("20")).toBeInTheDocument()
      expect(screen.getByText("15")).toBeInTheDocument()
      expect(screen.getByText("Entities")).toBeInTheDocument()
      expect(screen.getByText("Sensors")).toBeInTheDocument()
      expect(screen.getByText("Lights")).toBeInTheDocument()
      expect(screen.getByText("Switches")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      render(
        <homeassistantDefinition.Widget
          entities={0}
          sensors={0}
          lights={0}
          switches={0}
        />
      )
      expect(screen.getAllByText("0")).toHaveLength(4)
    })
  })
})
