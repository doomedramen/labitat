import type { ServiceDefinition } from "./types";

type DateTimeData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  time: string;
  date: string;
  timeZone: string;
  timeZoneOffset: string;
};

function DateTimeWidget({ time, date, timeZone, timeZoneOffset }: DateTimeData) {
  return (
    <div className="flex flex-col items-center justify-center py-2 text-center">
      <div className="text-2xl font-bold tabular-nums">{time}</div>
      <div className="mt-1 text-xs text-muted-foreground">{date}</div>
      <div className="mt-0.5 text-xs text-muted-foreground">
        {timeZone} (UTC{timeZoneOffset})
      </div>
    </div>
  );
}

export const datetimeDefinition: ServiceDefinition<DateTimeData> = {
  id: "datetime",
  name: "Date & Time",
  icon: "clock",
  category: "info",
  defaultPollingMs: 1_000,
  clientSide: true,
  configFields: [
    {
      key: "timeZone",
      label: "Timezone",
      type: "text",
      required: false,
      placeholder: "Leave blank for browser timezone",
      helperText: "e.g., America/New_York, Europe/London",
    },
    {
      key: "format24h",
      label: "24-hour format",
      type: "boolean",
      helperText: "Use 24-hour time format",
    },
  ],
  fetchData(config) {
    const timeZone = config.timeZone || undefined;
    const now = new Date();

    const timeOptions: Intl.DateTimeFormatOptions = {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: config.format24h !== "true",
      timeZone,
    };

    const dateOptions: Intl.DateTimeFormatOptions = {
      weekday: "long",
      year: "numeric",
      month: "long",
      day: "numeric",
      timeZone,
    };

    const time = now.toLocaleTimeString("en-US", timeOptions);
    const date = now.toLocaleDateString("en-US", dateOptions);

    // Get timezone offset
    const tzName =
      now.toLocaleTimeString("en-US", { timeZone, timeZoneName: "short" }).split(" ").pop() ?? "";
    const offsetMinutes = now.getTimezoneOffset();
    const offsetHours = -offsetMinutes / 60;
    const offsetStr = offsetHours >= 0 ? `+${offsetHours}` : `${offsetHours}`;

    return Promise.resolve({
      _status: "ok",
      time,
      date,
      timeZone: tzName,
      timeZoneOffset: offsetStr,
    });
  },
  renderWidget: DateTimeWidget,
};
