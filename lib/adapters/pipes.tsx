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

const CELL = 12
const MIN_PIPES = 3
const MAX_PIPES = 7
const FRAMES_PER_STEP = 3 // how many rAF frames between pipe advances
const TRAIL_FRAMES = 120 // frames a segment stays visible (guarantees full fade)
const TURN_CHANCE = 0.2
const MIN_PIPE_AGE = 30 // steps before a pipe can die
const MAX_PIPE_AGE = 180 // steps after which a pipe dies

type Segment = {
  x1: number // pixel coords of line
  y1: number
  x2: number
  y2: number
  dotX: number // junction dot center
  dotY: number
  color: string
  age: number // frames since created
}

type Pipe = {
  x: number // grid position
  y: number
  dir: Direction
  color: string
  age: number // step count
}

function spawnPipe(cols: number, rows: number): Pipe {
  return {
    x: Math.floor(Math.random() * cols),
    y: Math.floor(Math.random() * rows),
    dir: Math.floor(Math.random() * 4) as Direction,
    color: PIPE_COLORS[Math.floor(Math.random() * PIPE_COLORS.length)],
    age: 0,
  }
}

function PipesWidget() {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let rafId: number
    let pipes: Pipe[] = []
    let segments: Segment[] = []
    let cols: number
    let rows: number
    let frame = 0

    const init = () => {
      canvas.width = canvas.offsetWidth
      canvas.height = canvas.offsetHeight
      cols = Math.floor(canvas.width / CELL)
      rows = Math.floor(canvas.height / CELL)
      pipes = Array.from({ length: MIN_PIPES }, () => spawnPipe(cols, rows))
      segments = []
      frame = 0
    }

    const draw = () => {
      rafId = requestAnimationFrame(draw)
      frame++

      // Age out and remove fully-faded segments
      segments = segments.filter((s) => s.age < TRAIL_FRAMES)
      for (const s of segments) s.age++

      // Advance pipes on their schedule
      if (frame % FRAMES_PER_STEP === 0) {
        // Kill old pipes, always keeping at least MIN_PIPES alive
        pipes = pipes.filter((p) => {
          if (p.age < MIN_PIPE_AGE) return true
          if (p.age > MAX_PIPE_AGE) return false
          // Random chance to die once past minimum age
          return Math.random() > 0.01
        })

        // Immediately top up to minimum
        while (pipes.length < MIN_PIPES) {
          pipes.push(spawnPipe(cols, rows))
        }
        // Occasionally add an extra pipe up to max
        if (pipes.length < MAX_PIPES && Math.random() < 0.05) {
          pipes.push(spawnPipe(cols, rows))
        }

        for (const pipe of pipes) {
          const px = pipe.x * CELL + CELL / 2
          const py = pipe.y * CELL + CELL / 2
          const prevPx = px - DX[pipe.dir] * CELL
          const prevPy = py - DY[pipe.dir] * CELL

          segments.push({
            x1: prevPx,
            y1: prevPy,
            x2: px,
            y2: py,
            dotX: px,
            dotY: py,
            color: pipe.color,
            age: 0,
          })

          pipe.age++

          // Possibly turn (not 180°)
          if (Math.random() < TURN_CHANCE) {
            const turns = ([0, 1, 2, 3] as Direction[]).filter(
              (d) => d !== pipe.dir && d !== (pipe.dir + 2) % 4
            )
            pipe.dir = turns[Math.floor(Math.random() * turns.length)]
          }

          // Move, wrapping at edges
          pipe.x = (pipe.x + DX[pipe.dir] + cols) % cols
          pipe.y = (pipe.y + DY[pipe.dir] + rows) % rows
        }
      }

      // Clear to true black every frame
      ctx.fillStyle = "#000"
      ctx.fillRect(0, 0, canvas.width, canvas.height)

      // Draw segments oldest-first so newer ones render on top
      ctx.lineCap = "square"
      for (const s of segments) {
        const alpha = (1 - s.age / TRAIL_FRAMES) ** 1.5
        ctx.globalAlpha = alpha
        ctx.strokeStyle = s.color
        ctx.lineWidth = CELL * 0.5
        ctx.beginPath()
        ctx.moveTo(s.x1, s.y1)
        ctx.lineTo(s.x2, s.y2)
        ctx.stroke()

        ctx.fillStyle = s.color
        ctx.beginPath()
        ctx.arc(s.dotX, s.dotY, CELL * 0.28, 0, Math.PI * 2)
        ctx.fill()
      }
      ctx.globalAlpha = 1
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
      className="block h-24 w-full rounded-md bg-black"
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
