"use client"

import type { ServiceDefinition } from "./types"
import { useEffect, useState } from "react"

type DateTimeData = {
  _status?: "ok" | "warn" | "error" | "none"
  _statusText?: string
  timeZone: string
  timeZoneOffset: string
  date?: string
  time?: string
}

function DateTimeWidget({ timeZone }: DateTimeData) {
  const [currentTime, setCurrentTime] = useState<{
    date: string
    time: string
    tzDisplay: string
  }>({ date: "", time: "", tzDisplay: "" })

  useEffect(() => {
    const updateTime = () => {
      const now = new Date()
      const tz = timeZone || undefined

      const dateStr = now.toLocaleDateString("en-US", {
        timeZone: tz,
        weekday: "short",
        month: "short",
        day: "numeric",
      })

      const timeStr = now.toLocaleTimeString("en-US", {
        timeZone: tz,
        hour: "2-digit",
        minute: "2-digit",
        second: "2-digit",
        hour12: false,
      })

      const resolvedTz = tz ?? Intl.DateTimeFormat().resolvedOptions().timeZone
      const parts = new Intl.DateTimeFormat("en-US", {
        timeZone: resolvedTz,
        timeZoneName: "short",
      }).formatToParts(now)
      const tzName = parts.find((p) => p.type === "timeZoneName")?.value ?? ""

      setCurrentTime({
        date: dateStr,
        time: timeStr,
        tzDisplay: tzName,
      })
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [timeZone])

  return (
    <div className="text-center">
      <div className="text-3xl font-bold tracking-tight text-foreground tabular-nums">
        {currentTime.time || "--:--:--"}
      </div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {currentTime.date || "--/--/----"}
        {currentTime.tzDisplay && (
          <span className="ml-1.5 opacity-70">• {currentTime.tzDisplay}</span>
        )}
      </div>
    </div>
  )
}

export const datetimeDefinition: ServiceDefinition<DateTimeData> = {
  id: "datetime",
  name: "Date & Time",
  icon: "clock",
  category: "info",
  defaultPollingMs: undefined,
  clientSide: true, // Widget updates itself client-side

  configFields: [
    {
      key: "timeZone",
      label: "Time Zone",
      type: "text",
      required: false,
      placeholder: "e.g., America/New_York",
      helperText:
        "Leave empty for browser local time. Uses IANA time zone format.",
    },
  ],

  async fetchData(config) {
    // Minimal server-side work - widget handles all formatting client-side
    return {
      _status: "none" as const,
      timeZone: config.timeZone || "",
      timeZoneOffset: "",
    }
  },

  Widget: DateTimeWidget,
}
