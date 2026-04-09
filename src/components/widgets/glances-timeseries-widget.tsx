"use client"

import type { GlancesTimeseriesData } from "@/lib/adapters/glances-timeseries"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
} from "recharts"

function ChartTooltip({
  active,
  payload,
}: {
  active?: boolean
  payload?: { name: string; value: number; color: string }[]
}) {
  if (!active || !payload?.length) return null
  return (
    <div className="rounded-md border border-border bg-popover px-2 py-1 text-xs shadow-sm">
      {payload.map((p) => (
        <div key={p.name} className="flex items-center gap-1.5">
          <span
            className="inline-block h-1.5 w-1.5 rounded-full"
            style={{ backgroundColor: p.color }}
          />
          <span className="text-muted-foreground capitalize">{p.name}</span>
          <span className="ml-1 font-medium tabular-nums">{p.value}%</span>
        </div>
      ))}
    </div>
  )
}

export function GlancesTimeseriesWidget({
  history,
  _status,
  _statusText,
}: GlancesTimeseriesData) {
  if (_status === "error") {
    return (
      <div className="flex h-full items-center justify-center text-sm text-destructive">
        {_statusText ?? "Error fetching data"}
      </div>
    )
  }

  if (!history || history.length === 0) {
    return (
      <div className="flex h-full items-center justify-center text-sm text-muted-foreground">
        Waiting for data...
      </div>
    )
  }

  const last = history[history.length - 1]

  // Scale to the highest value in the window, rounded up to the nearest 10
  const rawMax = Math.max(...history.map((d) => Math.max(d.cpu, d.mem)), 1)
  const domainMax = Math.ceil(rawMax / 10) * 10
  const midLabel = Math.round(domainMax / 2)

  return (
    <div className="flex flex-col gap-1" style={{ minHeight: "150px" }}>
      <div className="flex gap-1">
        {/* Simple y-axis */}
        <div className="flex w-6 shrink-0 flex-col justify-between pb-0.5 text-right text-[10px] leading-none text-secondary-foreground">
          <span>{domainMax}</span>
          <span>{midLabel}</span>
          <span>0</span>
        </div>
        <ResponsiveContainer width="100%" height={130}>
          <AreaChart
            data={history}
            margin={{ top: 4, right: 4, left: 0, bottom: 0 }}
          >
            <defs>
              <linearGradient id="fillCpu" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--chart-1)"
                  stopOpacity={0.5}
                />
                <stop offset="95%" stopColor="var(--chart-1)" stopOpacity={0} />
              </linearGradient>
              <linearGradient id="fillMem" x1="0" y1="0" x2="0" y2="1">
                <stop
                  offset="5%"
                  stopColor="var(--chart-2)"
                  stopOpacity={0.5}
                />
                <stop offset="95%" stopColor="var(--chart-2)" stopOpacity={0} />
              </linearGradient>
            </defs>
            <XAxis dataKey="timestamp" hide />
            <YAxis domain={[0, domainMax]} hide />
            <Tooltip
              content={<ChartTooltip />}
              cursor={{ stroke: "var(--border)", strokeWidth: 1 }}
            />
            <Area
              type="monotone"
              dataKey="mem"
              fill="url(#fillMem)"
              stroke="var(--chart-2)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              isAnimationActive={false}
            />
            <Area
              type="monotone"
              dataKey="cpu"
              fill="url(#fillCpu)"
              stroke="var(--chart-1)"
              strokeWidth={1.5}
              dot={false}
              activeDot={{ r: 3, strokeWidth: 0 }}
              isAnimationActive={false}
            />
          </AreaChart>
        </ResponsiveContainer>
      </div>

      {/* Legend with live values */}
      <div className="flex items-center justify-center gap-4 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--chart-1)" }}
          />
          CPU
          {last && (
            <span className="font-medium text-foreground tabular-nums">
              {last.cpu}%
            </span>
          )}
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--chart-2)" }}
          />
          MEM
          {last && (
            <span className="font-medium text-foreground tabular-nums">
              {last.mem}%
            </span>
          )}
        </span>
      </div>
    </div>
  )
}
