import type { ServiceDefinition } from "./types"

type DateTimeData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  dateTime: string
  date: string
  time: string
  timeZone: string
  timeZoneOffset: string
}

function DateTimeWidget({
  dateTime,
  date,
  time,
  timeZone,
  timeZoneOffset,
}: DateTimeData) {
  return (
    <div className="space-y-1 text-center">
      <div className="text-2xl font-bold text-foreground tabular-nums">
        {time}
      </div>
      <div className="text-xs font-medium text-foreground">{date}</div>
      <div className="text-xs text-muted-foreground">
        {timeZone} ({timeZoneOffset})
      </div>
    </div>
  )
}

export const datetimeDefinition: ServiceDefinition<DateTimeData> = {
  id: "datetime",
  name: "Date & Time",
  icon: "clock",
  category: "info",
  defaultPollingMs: 1000,

  configFields: [
    {
      key: "timeZone",
      label: "Time Zone",
      type: "text",
      required: false,
      placeholder: "e.g., America/New_York",
      helperText:
        "Leave empty for server local time. Uses IANA time zone format.",
    },
  ],

  async fetchData(config) {
    const timeZone = config.timeZone || undefined

    let date: Date
    let displayTimeZone: string
    let displayTimeZoneOffset: string

    try {
      date = new Date()

      if (timeZone) {
        // Validate time zone
        const options: Intl.DateTimeFormatOptions = {
          timeZone,
          timeZoneName: "short",
        }
        const formatter = new Intl.DateTimeFormat("en-US", options)
        const parts = formatter.formatToParts(date)
        const timeZoneNamePart = parts.find((p) => p.type === "timeZoneName")

        if (!timeZoneNamePart) {
          throw new Error(`Invalid time zone: ${timeZone}`)
        }

        displayTimeZone = timeZone
        displayTimeZoneOffset = timeZoneNamePart.value

        // Get the time in the specified timezone
        const tzString = date.toLocaleString("en-US", { timeZone })
        date = new Date(tzString)
      } else {
        // Use local time
        displayTimeZone = Intl.DateTimeFormat().resolvedOptions().timeZone
        const offset = -date.getTimezoneOffset()
        const offsetHours = Math.floor(Math.abs(offset) / 60)
        const offsetMinutes = Math.abs(offset) % 60
        const sign = offset >= 0 ? "+" : "-"
        displayTimeZoneOffset = `UTC${sign}${offsetHours.toString().padStart(2, "0")}:${offsetMinutes.toString().padStart(2, "0")}`
      }

      // If we didn't already set offset (for custom timezone), calculate it
      if (!displayTimeZoneOffset && timeZone) {
        const tzDate = new Date(date.toLocaleString("en-US", { timeZone }))
        const utcDate = new Date(date.toUTCString())
        const diffMs = tzDate.getTime() - utcDate.getTime()
        const offsetHours = Math.floor(diffMs / (1000 * 60 * 60))
        const offsetMinutes = Math.abs(
          Math.floor((diffMs % (1000 * 60 * 60)) / (1000 * 60))
        )
        const sign = offsetHours >= 0 ? "+" : "-"
        displayTimeZoneOffset = `UTC${sign}${Math.abs(offsetHours).toString().padStart(2, "0")}:${offsetMinutes.toString().padStart(2, "0")}`
      }
    } catch (err) {
      if (err instanceof Error && err.message.includes("Invalid time zone")) {
        throw err
      }
      throw new Error(
        `Failed to get date/time: ${err instanceof Error ? err.message : "Unknown error"}`
      )
    }

    const dateStr = date.toLocaleDateString("en-US", {
      weekday: "short",
      year: "numeric",
      month: "short",
      day: "numeric",
    })

    const timeStr = date.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    })

    return {
      _status: "ok" as const,
      dateTime: date.toISOString(),
      date: dateStr,
      time: timeStr,
      timeZone: displayTimeZone,
      timeZoneOffset: displayTimeZoneOffset,
    }
  },

  Widget: DateTimeWidget,
}
