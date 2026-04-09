"use client"

import { useEffect, useRef } from "react"
import type { ServiceDefinition } from "./types"
import { WidgetContainer } from "@/components/widgets"

type PipesData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
}

const COLORS = [
  "#ff3333",
  "#3399ff",
  "#33cc55",
  "#ffcc00",
  "#ff66cc",
  "#33ffee",
  "#ff8833",
  "#cc99ff",
]
const CELL = 18
const PIPE_W = 8
const JOINT_R = 5
const TICK_MS = 80

// right, down, left, up
const DIRS = [
  { dx: 1, dy: 0 },
  { dx: 0, dy: 1 },
  { dx: -1, dy: 0 },
  { dx: 0, dy: -1 },
]

type Pipe = { x: number; y: number; dir: number; color: string; alive: boolean }

function PipesWidget(_: PipesData) {
  const canvasRef = useRef<HTMLCanvasElement>(null)

  useEffect(() => {
    const canvas = canvasRef.current
    if (!canvas) return
    const ctx = canvas.getContext("2d")
    if (!ctx) return

    let cols = 0
    let rows = 0
    let grid: boolean[][] = []
    let pipes: Pipe[] = []
    let timer: ReturnType<typeof setInterval>

    function center(x: number, y: number) {
      return { cx: x * CELL + CELL / 2, cy: y * CELL + CELL / 2 }
    }

    function spawnPipe() {
      for (let i = 0; i < 30; i++) {
        const x = Math.floor(Math.random() * cols)
        const y = Math.floor(Math.random() * rows)
        if (!grid[x]?.[y]) {
          grid[x][y] = true
          const color = COLORS[Math.floor(Math.random() * COLORS.length)]
          const dir = Math.floor(Math.random() * 4)
          pipes.push({ x, y, dir, color, alive: true })
          const { cx, cy } = center(x, y)
          ctx!.fillStyle = color
          ctx!.beginPath()
          ctx!.arc(cx, cy, JOINT_R, 0, Math.PI * 2)
          ctx!.fill()
          return
        }
      }
    }

    function init() {
      canvas!.width = canvas!.offsetWidth
      canvas!.height = canvas!.offsetHeight
      cols = Math.floor(canvas!.width / CELL)
      rows = Math.floor(canvas!.height / CELL)
      if (cols < 1 || rows < 1) return
      grid = Array.from({ length: cols }, () => Array(rows).fill(false))
      pipes = []
      ctx!.fillStyle = "#0a0a0a"
      ctx!.fillRect(0, 0, canvas!.width, canvas!.height)
      for (let i = 0; i < 4; i++) spawnPipe()
    }

    function tick() {
      const total = cols * rows
      if (total === 0) return

      // Reset when mostly full
      const occupied = grid.reduce((n, col) => n + col.filter(Boolean).length, 0)
      if (occupied / total > 0.85) {
        init()
        return
      }

      for (const pipe of pipes) {
        if (!pipe.alive) continue

        const prevDir = pipe.dir

        // Prefer straight ahead (75%), otherwise pick a random direction
        const straight = Math.random() < 0.75
        const order = straight
          ? [pipe.dir, ...DIRS.map((_, i) => i).filter((i) => i !== pipe.dir).sort(() => Math.random() - 0.5)]
          : DIRS.map((_, i) => i).sort(() => Math.random() - 0.5)

        let moved = false
        for (const d of order) {
          const nx = pipe.x + DIRS[d].dx
          const ny = pipe.y + DIRS[d].dy
          if (nx < 0 || ny < 0 || nx >= cols || ny >= rows) continue
          if (grid[nx][ny]) continue

          const { cx: ox, cy: oy } = center(pipe.x, pipe.y)
          const { cx: nx2, cy: ny2 } = center(nx, ny)

          // Segment
          ctx!.strokeStyle = pipe.color
          ctx!.lineWidth = PIPE_W
          ctx!.lineCap = "square"
          ctx!.beginPath()
          ctx!.moveTo(ox, oy)
          ctx!.lineTo(nx2, ny2)
          ctx!.stroke()

          // Ball joint at the turn
          if (d !== prevDir) {
            ctx!.fillStyle = pipe.color
            ctx!.beginPath()
            ctx!.arc(ox, oy, JOINT_R, 0, Math.PI * 2)
            ctx!.fill()
          }

          grid[nx][ny] = true
          pipe.x = nx
          pipe.y = ny
          pipe.dir = d
          moved = true
          break
        }

        if (!moved) {
          pipe.alive = false
        }
      }

      // Keep at least one active pipe
      if (pipes.every((p) => !p.alive)) spawnPipe()
    }

    init()
    timer = setInterval(tick, TICK_MS)

    const ro = new ResizeObserver(init)
    ro.observe(canvas)

    return () => {
      clearInterval(timer)
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
            style={{ height: 120, display: "block", background: "#0a0a0a" }}
          />
        ),
      }}
    />
  )
}

export const pipesDefinition: ServiceDefinition<PipesData> = {
  id: "pipes",
  name: "Pipes",
  icon: "pipes",
  category: "info",
  configFields: [],
  fetchData() {
    return Promise.resolve({ _status: "ok" })
  },
  renderWidget: PipesWidget,
}
