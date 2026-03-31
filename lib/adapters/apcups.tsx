import type { ServiceDefinition } from "./types"

type ApcupsData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  status: string
  load: string
  charge: string
  timeLeft: string
}

function ApcupsWidget({ status, load, charge, timeLeft }: ApcupsData) {
  const items = [
    { value: status, label: "Status" },
    { value: `${load}%`, label: "Load" },
    { value: `${charge}%`, label: "Battery" },
    {
      value: `${Math.floor((parseFloat(timeLeft) ?? 0) * 60)} min`,
      label: "Time Left",
    },
  ]

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-1.5 text-xs">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1 text-center"
        >
          <span className="font-medium text-foreground tabular-nums">
            {item.value}
          </span>
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export const apcupsDefinition: ServiceDefinition<ApcupsData> = {
  id: "apcups",
  name: "APC UPS",
  icon: "apc",
  category: "monitoring",
  defaultPollingMs: 30_000,

  configFields: [
    {
      key: "host",
      label: "Host",
      type: "text",
      required: true,
      placeholder: "192.168.1.78",
      helperText: "The host running apcupsd with NIS server enabled",
    },
    {
      key: "port",
      label: "Port",
      type: "number",
      required: false,
      placeholder: "3551",
      helperText: "Default: 3551 (apcupsd NIS port)",
    },
  ],

  async fetchData(config) {
    // Note: apcupsd uses a binary NIS protocol on port 3551
    // This requires a server-side proxy or REST wrapper to work in Next.js
    // Users should set up apcaccess-http or similar to expose the data via HTTP

    const host = config.host ?? "127.0.0.1"
    const port = config.port ?? 3551

    // Try to fetch from a REST wrapper (apcaccess-http, etc.)
    // Common patterns: http://host:port/status.json or http://host:3552/status
    const restUrls = [
      `http://${host}:${port}/status.json`,
      `http://${host}:3552/status`,
      `http://${host}/apc/status`,
    ]

    for (const url of restUrls) {
      try {
        const res = await fetch(url)
        if (res.ok) {
          const data = await res.json()
          return {
            _status: data.STATUS === "ONLINE" ? "ok" : ("warn" as const),
            status: data.STATUS ?? "UNKNOWN",
            load: data.LOADPCT ?? "0",
            charge: data.BCHARGE ?? "0",
            timeLeft: data.TIMELEFT ?? "0",
          }
        }
      } catch {
        // Try next URL
      }
    }

    // If no REST wrapper found, throw helpful error
    throw new Error(
      "APC UPS requires a REST wrapper. Install apcaccess-http or similar on the apcupsd host. " +
        "See: https://github.com/apcupsd/apcupsd or set up a custom HTTP endpoint that returns JSON."
    )
  },

  Widget: ApcupsWidget,
}
