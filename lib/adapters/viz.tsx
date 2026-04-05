"use client"

import { useId } from "react"
import { cn } from "@/lib/utils"

// ── Bytes formatter ───────────────────────────────────────────────────────────

export function formatBytes(bytes: number, decimals = 1): string {
  if (bytes >= 1e9) return `${(bytes / 1e9).toFixed(decimals)} GB`
  if (bytes >= 1e6) return `${(bytes / 1e6).toFixed(decimals)} MB`
  if (bytes >= 1e3) return `${(bytes / 1e3).toFixed(decimals)} KB`
  return `${bytes.toFixed(0)} B`
}

// ── Time series chart ─────────────────────────────────────────────────────────

export type TimeSeriesChartProps = {
  history: number[]
  /** Y-axis maximum. For dynamic ranges, compute in the widget and pass here. */
  max?: number
  /** Tailwind text color class that drives currentColor in the SVG, e.g. "text-primary" */
  colorClass?: string
  /** Left label displayed below the chart */
  label?: string
  /** Right label (pre-formatted current value) displayed below the chart */
  valueLabel?: string
  /** Chart height in px */
  height?: number
  className?: string
}

export function TimeSeriesChart({
  history,
  max = 100,
  colorClass = "text-primary",
  label,
  valueLabel,
  height = 36,
  className,
}: TimeSeriesChartProps) {
  const uid = useId().replace(/:/g, "")
  const gradId = `tsc-${uid}`

  const W = 200
  const H = height
  const PAD = 1

  const clampedMax = Math.max(max, 0.001)

  const toY = (v: number) =>
    H - PAD - Math.min(1, Math.max(0, v / clampedMax)) * (H - PAD * 2)

  const pts =
    history.length === 0
      ? []
      : history.length === 1
        ? [
            { x: 0, y: toY(history[0]) },
            { x: W, y: toY(history[0]) },
          ]
        : history.map((v, i) => ({
            x: (i / (history.length - 1)) * W,
            y: toY(v),
          }))

  const linePath = pts.reduce((acc, pt, i) => {
    if (i === 0) return `M ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
    const prev = pts[i - 1]
    const cpx = prev.x + (pt.x - prev.x) / 2
    return `${acc} C ${cpx.toFixed(1)},${prev.y.toFixed(1)} ${cpx.toFixed(1)},${pt.y.toFixed(1)} ${pt.x.toFixed(1)},${pt.y.toFixed(1)}`
  }, "")

  const areaPath =
    pts.length === 0
      ? ""
      : `${linePath} L ${pts.at(-1)!.x.toFixed(1)},${H} L ${pts[0].x.toFixed(1)},${H} Z`

  return (
    <div className={cn("space-y-1", className)}>
      <svg
        width="100%"
        height={H}
        viewBox={`0 0 ${W} ${H}`}
        preserveAspectRatio="none"
        className={cn("block overflow-visible", colorClass)}
        aria-hidden
      >
        <defs>
          <linearGradient id={gradId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor="currentColor" stopOpacity="0.25" />
            <stop offset="100%" stopColor="currentColor" stopOpacity="0.02" />
          </linearGradient>
        </defs>
        {pts.length > 0 && (
          <>
            <path d={areaPath} fill={`url(#${gradId})`} />
            <path
              d={linePath}
              fill="none"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
              vectorEffect="non-scaling-stroke"
            />
          </>
        )}
      </svg>
      {(label || valueLabel) && (
        <div className="flex items-baseline justify-between text-xs">
          {label && <span className="text-muted-foreground">{label}</span>}
          {valueLabel && (
            <span className={cn("font-medium tabular-nums", colorClass)}>
              {valueLabel}
            </span>
          )}
        </div>
      )}
    </div>
  )
}

// ── Vertical temperature bar ──────────────────────────────────────────────────

function tempColor(c: number) {
  if (c < 60) return "bg-emerald-500"
  if (c < 80) return "bg-amber-400"
  return "bg-red-500"
}

export type TempBarProps = {
  label: string
  celsius: number
  /** Max value for bar height calculation (defaults to critical threshold or 100) */
  max?: number
  className?: string
}

export function TempBar({
  label,
  celsius,
  max = 100,
  className,
}: TempBarProps) {
  const pct = Math.min(100, Math.max(0, (celsius / max) * 100))

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative flex h-14 w-4 items-end overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "w-full rounded-full transition-all duration-700",
            tempColor(celsius)
          )}
          style={{ height: `${pct}%` }}
        />
      </div>
      <span className="text-[10px] leading-none font-medium text-foreground tabular-nums">
        {celsius.toFixed(0)}°
      </span>
      <span
        className="max-w-[2.5rem] truncate text-center text-[9px] leading-tight text-muted-foreground"
        title={label}
      >
        {label}
      </span>
    </div>
  )
}

// ── Horizontal progress bar (used for per-core CPU and processes) ─────────────

// ── Disk donut ────────────────────────────────────────────────────────────────

function diskDonutColor(pct: number) {
  if (pct < 70) return "text-emerald-500"
  if (pct < 85) return "text-amber-400"
  return "text-red-500"
}

export type DiskDonutProps = {
  /** Mount point label, e.g. "/" or "sda1" */
  label: string
  /** Friendly name, e.g. "System" */
  name?: string
  /** Usage percentage 0–100 */
  percent: number
  /** Bytes used */
  used: number
  /** Bytes total */
  total: number
  className?: string
}

export function DiskDonut({
  label,
  name,
  percent,
  used,
  total,
  className,
}: DiskDonutProps) {
  const R = 22
  const CX = 28
  const CY = 28
  const circumference = 2 * Math.PI * R
  const filled = Math.min(1, Math.max(0, percent / 100)) * circumference
  // Rotate so arc starts from the top (–90°)
  const rotation = -90
  const colorClass = diskDonutColor(percent)

  return (
    <div className={cn("flex flex-col items-center gap-1", className)}>
      <div className="relative">
        <svg
          width={CX * 2}
          height={CY * 2}
          viewBox={`0 0 ${CX * 2} ${CY * 2}`}
          className={colorClass}
          aria-hidden
        >
          {/* Track */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            className="opacity-15"
          />
          {/* Arc */}
          <circle
            cx={CX}
            cy={CY}
            r={R}
            fill="none"
            stroke="currentColor"
            strokeWidth="5"
            strokeLinecap="round"
            strokeDasharray={`${filled.toFixed(1)} ${circumference.toFixed(1)}`}
            transform={`rotate(${rotation} ${CX} ${CY})`}
            className="transition-all duration-700"
          />
        </svg>
        {/* Percentage centred in the ring */}
        <span
          className={cn(
            "absolute inset-0 flex items-center justify-center text-[11px] font-semibold tabular-nums",
            colorClass
          )}
        >
          {percent.toFixed(0)}%
        </span>
      </div>
      <span className="text-[10px] leading-none font-medium text-foreground">
        {name ?? label}
      </span>
      <span className="text-[9px] leading-tight text-muted-foreground">
        {formatBytes(used, 0)} / {formatBytes(total, 0)}
      </span>
    </div>
  )
}

// ── Mini bar ──────────────────────────────────────────────────────────────────

export type MiniBarProps = {
  label: string
  value: number
  max?: number
  /** Right-side value string (pre-formatted) */
  valueLabel?: string
  colorClass?: string
  className?: string
}

export function MiniBar({
  label,
  value,
  max = 100,
  valueLabel,
  colorClass = "bg-primary",
  className,
}: MiniBarProps) {
  const pct = Math.min(100, Math.max(0, (value / Math.max(max, 0.001)) * 100))

  return (
    <div className={cn("flex items-center gap-2 text-xs", className)}>
      <span className="w-6 shrink-0 text-right font-mono text-muted-foreground">
        {label}
      </span>
      <div className="relative h-1.5 flex-1 overflow-hidden rounded-full bg-secondary">
        <div
          className={cn(
            "h-full rounded-full transition-all duration-500",
            colorClass
          )}
          style={{ width: `${pct}%` }}
        />
      </div>
      {valueLabel && (
        <span className="w-8 shrink-0 text-right text-muted-foreground tabular-nums">
          {valueLabel}
        </span>
      )}
    </div>
  )
}
