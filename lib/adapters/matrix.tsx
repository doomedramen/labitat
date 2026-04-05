"use client"

import { useEffect, useRef } from "react"
import type { ServiceDefinition } from "./types"

// ── Matrix digital rain ───────────────────────────────────────────────────────

const CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789ABCDEF"

function MatrixWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    const FONT_SIZE = 11
    let rafId: number
    let cols: number
    let drops: number[]

    const init = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      cols = Math.floor(canvas.width / FONT_SIZE)
      drops = Array.from({ length: cols }, () =>
        Math.floor(Math.random() * -(canvas.height / FONT_SIZE))
      )
    }

    const draw = () => {
      // Fade the previous frame
      ctx.fillStyle = "rgba(0, 0, 0, 0.05)"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = `${FONT_SIZE}px monospace`

      drops.forEach((y, i) => {
        const char = CHARS[Math.floor(Math.random() * CHARS.length)]
        const x = i * FONT_SIZE

        // Head char: bright green
        ctx.fillStyle = "#7fff7f"
        ctx.fillText(char, x, y * FONT_SIZE)

        // Trail: dim green
        if (y > 1) {
          ctx.fillStyle = "#00cc44"
          ctx.fillText(
            CHARS[Math.floor(Math.random() * CHARS.length)],
            x,
            (y - 1) * FONT_SIZE
          )
        }

        // Reset column randomly once it exits the canvas
        if (y * FONT_SIZE > canvas.height && Math.random() > 0.975) {
          drops[i] = 0
        }
        drops[i]++
      })

      rafId = requestAnimationFrame(draw)
    }

    init()
    rafId = requestAnimationFrame(draw)

    const ro = new ResizeObserver(() => {
      init()
      ctx.fillStyle = "black"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
    })
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="block h-24 w-full rounded-md bg-black"
      aria-hidden
    />
  )
}

// ── Adapter definition ────────────────────────────────────────────────────────

export const matrixDefinition: ServiceDefinition = {
  id: "matrix",
  name: "Matrix Rain",
  icon: "terminal",
  category: "info",
  clientSide: true,
  configFields: [],
  Widget: MatrixWidget,
}
