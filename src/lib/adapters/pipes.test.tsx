import { render } from "@testing-library/react"
import { describe, it, expect, beforeEach, afterEach, vi } from "vitest"
import { pipesDefinition } from "@/lib/adapters/pipes"

const mockCtx = {
  fillStyle: "",
  strokeStyle: "",
  lineWidth: 0,
  lineCap: "" as CanvasLineCap,
  font: "",
  fillRect: vi.fn(),
  fillText: vi.fn(),
  beginPath: vi.fn(),
  arc: vi.fn(),
  fill: vi.fn(),
  moveTo: vi.fn(),
  lineTo: vi.fn(),
  stroke: vi.fn(),
}

describe("pipes definition", () => {
  it("has correct metadata", () => {
    expect(pipesDefinition.id).toBe("pipes")
    expect(pipesDefinition.name).toBe("Pipes")
    expect(pipesDefinition.icon).toBe("pipes")
    expect(pipesDefinition.category).toBe("info")
  })

  it("has no required config fields", () => {
    expect(pipesDefinition.configFields).toHaveLength(0)
  })

  describe("fetchData", () => {
    it("returns ok status with no config needed", async () => {
      const result = await pipesDefinition.fetchData!({})
      expect(result._status).toBe("ok")
    })
  })

  describe("renderWidget", () => {
    beforeEach(() => {
      class MockResizeObserver {
        observe = vi.fn()
        disconnect = vi.fn()
      }
      vi.stubGlobal("ResizeObserver", MockResizeObserver)
      vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue(
        mockCtx as unknown as CanvasRenderingContext2D
      )
    })

    afterEach(() => {
      vi.restoreAllMocks()
    })

    it("renders a canvas element", () => {
      const Widget = pipesDefinition.renderWidget!
      const { container } = render(<Widget />)
      expect(container.querySelector("canvas")).toBeInTheDocument()
    })

    it("canvas has dark background style", () => {
      const Widget = pipesDefinition.renderWidget!
      const { container } = render(<Widget />)
      const canvas = container.querySelector("canvas")
      // jsdom normalises #0a0a0a → rgb(10, 10, 10)
      expect(canvas?.style.background).toBe("rgb(10, 10, 10)")
    })
  })
})
