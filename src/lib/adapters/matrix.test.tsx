import { render } from "@testing-library/react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { matrixDefinition } from "@/lib/adapters/matrix"

// Canvas is not available in jsdom — stub the minimal API used by the widget
const mockCtx = {
  fillStyle: "",
  font: "",
  fillRect: vi.fn(),
  fillText: vi.fn(),
}

describe("matrix definition", () => {
  it("has correct metadata", () => {
    expect(matrixDefinition.id).toBe("matrix")
    expect(matrixDefinition.name).toBe("Matrix Rain")
    expect(matrixDefinition.icon).toBe("matrix")
    expect(matrixDefinition.category).toBe("info")
  })

  it("has no config fields", () => {
    expect(matrixDefinition.configFields).toHaveLength(0)
  })

  describe("fetchData", () => {
    it("returns ok status with no config needed", async () => {
      const result = await matrixDefinition.fetchData!({})
      expect(result._status).toBe("ok")
    })
  })

  describe("renderWidget", () => {
    beforeEach(() => {
      // Stub ResizeObserver and canvas context for jsdom
      vi.stubGlobal(
        "ResizeObserver",
        vi.fn(() => ({ observe: vi.fn(), disconnect: vi.fn() }))
      )
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
        mockCtx as unknown as CanvasRenderingContext2D
      )
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("renders a canvas element", () => {
      const Widget = matrixDefinition.renderWidget!
      const { container } = render(<Widget />)
      expect(container.querySelector("canvas")).toBeInTheDocument()
    })

    it("canvas has black background style", () => {
      const Widget = matrixDefinition.renderWidget!
      const { container } = render(<Widget />)
      const canvas = container.querySelector("canvas")
      expect(canvas?.style.background).toBe("rgb(0, 0, 0)")
    })
  })
})
