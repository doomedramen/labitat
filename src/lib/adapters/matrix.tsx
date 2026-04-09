"use client"

import { useEffect, useRef } from "react"
import type { ServiceDefinition } from "./types"
import { WidgetContainer } from "@/components/widgets"

type MatrixRainData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
}

const CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF"

function MatrixRainWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const FONT_SIZE = 13
    const FPS = 15
    const INTERVAL = 1000 / FPS
    let animId: number
    let drops: number[] = []
    let lastFrame = 0

    function init() {
      canvas!.width = canvas!.offsetWidth
      canvas!.height = canvas!.offsetHeight
      const cols = Math.floor(canvas!.width / FONT_SIZE)
      drops = Array.from({ length: cols }, () =>
        Math.floor(Math.random() * -(canvas!.height / FONT_SIZE))
      )
      ctx!.fillStyle = "#000"
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height)
    }

    function draw(ts: number) {
      animId = requestAnimationFrame(draw)
      if (ts - lastFrame < INTERVAL) return
      lastFrame = ts

      const w = canvas!.width
      const h = canvas!.height

      ctx!.fillStyle = "rgba(0,0,0,0.08)"
      ctx!.fillRect(0, 0, w, h)

      ctx!.font = `${FONT_SIZE}px monospace`

      for (let i = 0; i < drops.length; i++) {
        const y = drops[i] * FONT_SIZE

        if (y >= 0 && y < h) {
          const char = CHARS[Math.floor(Math.random() * CHARS.length)]
          ctx!.fillStyle = "#ccffcc"
          ctx!.fillText(char, i * FONT_SIZE, y)
        }

        if (y > h && Math.random() > 0.97) {
          drops[i] = 0
        }
        drops[i]++
      }
    }

    init()

    const ro = new ResizeObserver(init)
    ro.observe(canvas)

    animId = requestAnimationFrame(draw)

    return () => {
      cancelAnimationFrame(animId)
      ro.disconnect()
    }
  }, [])

  return (
    <WidgetContainer
      payload={{
        stats: [],
        customComponent: (
          <canvas
            ref={canvasRef}
            className="w-full rounded"
            style={{ height: 120, display: "block", background: "#000" }}
          />
        ),
      }}
    />
  )
}

export const matrixDefinition: ServiceDefinition<MatrixRainData> = {
  id: "matrix",
  name: "Matrix Rain",
  icon: "matrix",
  category: "info",
  configFields: [],
  fetchData() {
    return Promise.resolve({ _status: "ok" })
  },
  renderWidget: MatrixRainWidget,
}
