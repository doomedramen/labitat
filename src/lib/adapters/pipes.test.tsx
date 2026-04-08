import { render, screen } from "@testing-library/react"
import { describe, it, expect, vi, beforeEach, afterEach } from "vitest"
import { pipesDefinition } from "@/lib/adapters/pipes"

describe("pipes definition", () => {
  it("has correct metadata", () => {
    expect(pipesDefinition.id).toBe("pipes")
    expect(pipesDefinition.name).toBe("Pipes")
    expect(pipesDefinition.icon).toBe("pipes")
    expect(pipesDefinition.category).toBe("info")
  })

  it("has configFields defined", () => {
    expect(pipesDefinition.configFields).toBeDefined()
    expect(pipesDefinition.configFields).toHaveLength(1)
    expect(pipesDefinition.configFields[0].key).toBe("message")
    expect(pipesDefinition.configFields[0].type).toBe("text")
    expect(pipesDefinition.configFields[0].required).toBe(false)
  })

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks()
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("returns default message when not provided", async () => {
      const result = await pipesDefinition.fetchData!({})

      expect(result._status).toBe("ok")
      expect(result.message).toBe("Pipes connected!")
    })

    it("uses provided message", async () => {
      const result = await pipesDefinition.fetchData!({
        message: "Custom message",
      })

      expect(result._status).toBe("ok")
      expect(result.message).toBe("Custom message")
    })
  })

  describe("Widget", () => {
    it("renders with default message", () => {
      render(<pipesDefinition.Widget message="Pipes connected!" />)
      expect(screen.getByText("Pipes connected!")).toBeInTheDocument()
    })

    it("renders custom message", () => {
      render(<pipesDefinition.Widget message="Hello, World!" />)
      expect(screen.getByText("Hello, World!")).toBeInTheDocument()
    })

    it("applies muted foreground styling", () => {
      const { container } = render(<pipesDefinition.Widget message="Test" />)
      const element = container.querySelector(".text-muted-foreground")
      expect(element).toBeInTheDocument()
    })
  })
})
