"use client"

import type { GlancesTimeseriesData } from "@/lib/adapters/glances-timeseries"
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  ResponsiveContainer,
} from "recharts"

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

  return (
    <div className="flex h-full flex-col" style={{ minHeight: "150px" }}>
      <ResponsiveContainer width="100%" height={130}>
        <AreaChart
          data={history}
          margin={{ top: 5, right: 0, left: 0, bottom: 0 }}
        >
          <defs>
            <linearGradient id="fillCpu" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-1)" stopOpacity={0.6} />
              <stop
                offset="95%"
                stopColor="var(--chart-1)"
                stopOpacity={0.05}
              />
            </linearGradient>
            <linearGradient id="fillMem" x1="0" y1="0" x2="0" y2="1">
              <stop offset="5%" stopColor="var(--chart-2)" stopOpacity={0.6} />
              <stop
                offset="95%"
                stopColor="var(--chart-2)"
                stopOpacity={0.05}
              />
            </linearGradient>
          </defs>
          <CartesianGrid
            strokeDasharray="3 3"
            className="stroke-muted"
            vertical={false}
          />
          <XAxis dataKey="timestamp" hide />
          <YAxis
            domain={[0, 100]}
            tick={{ fontSize: 10, fill: "var(--muted-foreground)" }}
            width={35}
            tickFormatter={(value: number) => `${value}%`}
          />
          <Area
            type="monotone"
            dataKey="mem"
            fill="url(#fillMem)"
            stroke="var(--chart-2)"
            strokeWidth={2}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
          <Area
            type="monotone"
            dataKey="cpu"
            fill="url(#fillCpu)"
            stroke="var(--chart-1)"
            strokeWidth={2}
            dot={false}
            activeDot={false}
            isAnimationActive={false}
          />
        </AreaChart>
      </ResponsiveContainer>
      <div className="flex items-center justify-center gap-4 pt-1 text-xs text-muted-foreground">
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--chart-1)" }}
          />
          CPU
        </span>
        <span className="flex items-center gap-1.5">
          <span
            className="inline-block h-2 w-2 rounded-full"
            style={{ backgroundColor: "var(--chart-2)" }}
          />
          MEM
        </span>
      </div>
    </div>
  )
}
