"use client"

import type { ServiceDefinition } from "./types"
import { Clock, Calendar, Globe } from "lucide-react"
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
        year: "numeric",
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
        tzDisplay: `${resolvedTz} (${tzName})`,
      })
    }

    updateTime()
    const interval = setInterval(updateTime, 1000)
    return () => clearInterval(interval)
  }, [timeZone])

  return (
    <div className="space-y-2">
      <div className="flex items-center justify-center gap-2">
        <Clock className="size-5 text-muted-foreground" />
        <div className="text-2xl font-bold text-foreground tabular-nums">
          {currentTime.time || "--:--:--"}
        </div>
      </div>
      <div className="flex items-center justify-center gap-1 text-xs font-medium text-foreground">
        <Calendar className="size-3 text-muted-foreground" />
        {currentTime.date || "--/--/----"}
      </div>
      <div className="flex items-center justify-center gap-1 text-xs text-muted-foreground">
        <Globe className="size-3" />
        {currentTime.tzDisplay}
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
    const timeZone = config.timeZone || undefined
    const now = new Date()

    let displayTimeZone: string
    let displayTimeZoneOffset: string

    if (timeZone) {
      // Validate time zone
      const options: Intl.DateTimeFormatOptions = {
        timeZone,
        timeZoneName: "short",
      }
      const formatter = new Intl.DateTimeFormat("en-US", options)
      const parts = formatter.formatToParts(now)
      const timeZoneNamePart = parts.find((p) => p.type === "timeZoneName")

      if (!timeZoneNamePart) {
        throw new Error(`Invalid time zone: ${timeZone}`)
      }

      displayTimeZone = timeZone
      displayTimeZoneOffset = timeZoneNamePart.value
    } else {
      // Use local time
      displayTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
      const offset = -now.getTimezoneOffset()
      const offsetHours = Math.floor(Math.abs(offset) / 60)
      const offsetMinutes = Math.abs(offset) % 60
      const sign = offset >= 0 ? "+" : "-"
      displayTimeZoneOffset = `UTC${sign}${offsetHours.toString().padStart(2, "0")}:${offsetMinutes.toString().padStart(2, "0")}`
    }

    return {
      _status: "none" as const, // Static config - widget updates client-side
      timeZone: displayTimeZone,
      timeZoneOffset: displayTimeZoneOffset,
    }
  },

  Widget: DateTimeWidget,
}
