"use client"

import { useEffect, useRef } from "react"
import type { ServiceDefinition } from "./types"

// ── Pipes screensaver ─────────────────────────────────────────────────────────

const PIPE_COLORS = [
  "#f97316", // orange
  "#3b82f6", // blue
  "#a855f7", // purple
  "#10b981", // emerald
  "#ef4444", // red
  "#eab308", // yellow
  "#06b6d4", // cyan
  "#ec4899", // pink
]

type Direction = 0 | 1 | 2 | 3 // right, down, left, up

const DX = [1, 0, -1, 0]
const DY = [0, 1, 0, -1]

type Pipe = {
  x: number
  y: number
  dir: Direction
  color: string
  age: number
}

const CELL = 12
const MAX_PIPES = 6
const TURN_CHANCE = 0.15
const NEW_PIPE_CHANCE = 0.004
const MAX_AGE = 200

function PipesWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let rafId: number
    let pipes: Pipe[] = []
    let cols: number
    let rows: number

    const spawnPipe = (): Pipe => ({
      x: Math.floor(Math.random() * cols),
      y: Math.floor(Math.random() * rows),
      dir: Math.floor(Math.random() * 4) as Direction,
      color: PIPE_COLORS[Math.floor(Math.random() * PIPE_COLORS.length)],
      age: 0,
    })

    const init = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      cols = Math.floor(canvas.width / CELL)
      rows = Math.floor(canvas.height / CELL)
      ctx.fillStyle = "#0a0a0a"
      ctx.fillRect(0, 0, canvas.width, canvas.height)
      pipes = Array.from({ length: 3 }, spawnPipe)
    }

    const draw = () => {
      // Occasionally spawn a new pipe
      if (pipes.length < MAX_PIPES && Math.random() < NEW_PIPE_CHANCE) {
        pipes.push(spawnPipe())
      }

      pipes.forEach((pipe, idx) => {
        // Draw segment
        const px = pipe.x * CELL + CELL / 2
        const py = pipe.y * CELL + CELL / 2

        ctx.strokeStyle = pipe.color
        ctx.lineWidth = CELL * 0.45
        ctx.lineCap = "square"

        const prevX = px - DX[pipe.dir] * CELL
        const prevY = py - DY[pipe.dir] * CELL

        ctx.beginPath()
        ctx.moveTo(prevX, prevY)
        ctx.lineTo(px, py)
        ctx.stroke()

        // Draw connector dot at junction
        ctx.fillStyle = pipe.color
        ctx.beginPath()
        ctx.arc(px, py, CELL * 0.3, 0, Math.PI * 2)
        ctx.fill()

        // Advance pipe
        pipe.age++

        // Remove old pipes
        if (pipe.age > MAX_AGE) {
          pipes.splice(idx, 1)
          return
        }

        // Possibly turn
        if (Math.random() < TURN_CHANCE) {
          const turns: Direction[] = [0, 1, 2, 3].filter(
            (d) => d !== pipe.dir && d !== (pipe.dir + 2) % 4
          ) as Direction[]
          pipe.dir = turns[Math.floor(Math.random() * turns.length)]
        }

        // Move
        pipe.x = (pipe.x + DX[pipe.dir] + cols) % cols
        pipe.y = (pipe.y + DY[pipe.dir] + rows) % rows
      })

      rafId = requestAnimationFrame(draw)
    }

    init()
    rafId = requestAnimationFrame(draw)

    const ro = new ResizeObserver(() => init())
    ro.observe(canvas)

    return () => {
      cancelAnimationFrame(rafId)
      ro.disconnect()
    }
  }, [])

  return (
    <canvas
      ref={canvasRef}
      className="block h-24 w-full rounded-md"
      style={{ background: "#0a0a0a" }}
      aria-hidden
    />
  )
}

// ── Adapter definition ────────────────────────────────────────────────────────

export const pipesDefinition: ServiceDefinition = {
  id: "pipes",
  name: "Pipes",
  icon: "workflow",
  category: "info",
  clientSide: true,
  configFields: [],
  Widget: PipesWidget,
}
