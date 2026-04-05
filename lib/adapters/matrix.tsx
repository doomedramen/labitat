"use client"

import { useEffect, useRef } from "react"
import type { ServiceDefinition } from "./types"

// ── Matrix digital rain ───────────────────────────────────────────────────────

const CHARS =
  "アイウエオカキクケコサシスセソタチツテトナニヌネノハヒフヘホマミムメモヤユヨラリルレロワヲン0123456789"

const CELL = 16
const MIN_SPEED = 2 // frames between steps (fast)
const MAX_SPEED = 6 // frames between steps (slow)
const MIN_LEN = 8
const MAX_LEN = 28

type Column = {
  y: number // current head row (can be negative = not yet visible)
  speed: number // frames per step
  length: number // trail length in cells
  chars: string[] // fixed characters for each trail cell
  tick: number // frame counter for this column
}

function randomChar() {
  return CHARS[Math.floor(Math.random() * CHARS.length)]
}

function MatrixWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let rafId: number
    let cols: number
    let rows: number
    let columns: Column[] = []

    const spawnColumn = (col: number, immediate: boolean): Column => {
      const length = MIN_LEN + Math.floor(Math.random() * (MAX_LEN - MIN_LEN))
      return {
        y: immediate
          ? Math.floor(Math.random() * rows) // start anywhere on screen
          : -Math.floor(Math.random() * rows), // stagger entry from above
        speed: MIN_SPEED + Math.floor(Math.random() * (MAX_SPEED - MIN_SPEED)),
        length,
        chars: Array.from({ length: length + 1 }, randomChar),
        tick: 0,
      }
    }

    const init = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      cols = Math.floor(canvas.width / CELL)
      rows = Math.ceil(canvas.height / CELL)
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      // First init: stagger columns so they don't all arrive at once
      columns = Array.from({ length: cols }, (_, i) => spawnColumn(i, false))
    }

    const draw = () => {
      rafId = requestAnimationFrame(draw)

      // Clear to black each frame — trails come from per-column history
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      ctx.font = `bold ${CELL}px monospace`
      ctx.textAlign = "left"
      ctx.textBaseline = "top"

      columns.forEach((col, i) => {
        col.tick++
        if (col.tick >= col.speed) {
          col.tick = 0
          col.y++
          // Mutate head character each step for shimmer
          col.chars[0] = randomChar()
          // Reset when trail has fully scrolled off-screen
          if (col.y - col.length > rows) {
            columns[i] = spawnColumn(i, false)
            return
          }
        }

        const x = i * CELL

        for (let t = 0; t <= col.length; t++) {
          const row = col.y - t
          if (row < 0 || row >= rows) continue

          const y = row * CELL
          const char = col.chars[t] ?? randomChar()

          if (t === 0) {
            // Head: bright white
            ctx.fillStyle = "#e0ffe0"
          } else {
            // Trail: fade from bright green to near-black
            const fade = 1 - t / col.length
            const g = Math.round(180 * fade * fade)
            ctx.fillStyle = `rgb(0,${g},0)`
          }

          ctx.fillText(char, x, y)
        }
      })
    }

    init()
    rafId = requestAnimationFrame(draw)

    const ro = new ResizeObserver(() => {
      init()
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
