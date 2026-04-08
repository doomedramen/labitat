import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { matrixDefinition } from "@/lib/adapters/matrix"

describe("matrix definition", () => {
  it("has correct metadata", () => {
    expect(matrixDefinition.id).toBe("matrix")
    expect(matrixDefinition.name).toBe("Matrix (Synapse)")
    expect(matrixDefinition.icon).toBe("element")
    expect(matrixDefinition.category).toBe("productivity")
    expect(matrixDefinition.defaultPollingMs).toBe(30_000)
  })

  it("has configFields defined", () => {
    expect(matrixDefinition.configFields).toBeDefined()
    expect(matrixDefinition.configFields).toHaveLength(1)
    expect(matrixDefinition.configFields[0].key).toBe("url")
    expect(matrixDefinition.configFields[0].type).toBe("url")
    expect(matrixDefinition.configFields[0].required).toBe(true)
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("fetches data successfully with stats", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () =>
            Promise.resolve({
              total_users: 50,
              total_public_rooms: 20,
            }),
        })
      )

      const result = await matrixDefinition.fetchData!({
        url: "https://matrix.example.com/",
      })

      expect(result._status).toBe("ok")
      expect(result.users).toBe(50)
      expect(result.rooms).toBe(20)
      expect(result.messages).toBe(0)
      expect(result.version).toBe("Online")
    })

    it("returns defaults when stats endpoint fails", async () => {
      vi.stubGlobal("fetch", () => Promise.resolve({ ok: false, status: 403 }))

      const result = await matrixDefinition.fetchData!({
        url: "https://matrix.example.com",
      })

      expect(result._status).toBe("ok")
      expect(result.users).toBe(0)
      expect(result.rooms).toBe(0)
      expect(result.messages).toBe(0)
      expect(result.version).toBe("Online")
    })

    it("handles missing stats data with defaults", async () => {
      vi.stubGlobal("fetch", () =>
        Promise.resolve({
          ok: true,
          json: () => Promise.resolve({}),
        })
      )

      const result = await matrixDefinition.fetchData!({
        url: "https://matrix.example.com",
      })

      expect(result.users).toBe(0)
      expect(result.rooms).toBe(0)
    })
  })

  describe("Widget", () => {
    it("renders with sample data", () => {
      render(
        <matrixDefinition.Widget
          users={50}
          rooms={20}
          messages={1000}
          version="Online"
        />
      )
      expect(screen.getByText("50")).toBeInTheDocument()
      expect(screen.getByText("20")).toBeInTheDocument()
      expect(screen.getByText("1000")).toBeInTheDocument()
      expect(screen.getByText("Online")).toBeInTheDocument()
      expect(screen.getByText("Users")).toBeInTheDocument()
      expect(screen.getByText("Rooms")).toBeInTheDocument()
      expect(screen.getByText("Messages")).toBeInTheDocument()
      expect(screen.getByText("Version")).toBeInTheDocument()
    })

    it("renders zero values", () => {
      render(
        <matrixDefinition.Widget
          users={0}
          rooms={0}
          messages={0}
          version="Online"
        />
      )
      expect(screen.getAllByText("0")).toHaveLength(3)
      expect(screen.getByText("Online")).toBeInTheDocument()
    })
  })
})
