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
    { value: load, label: "Load" },
    { value: charge, label: "Battery" },
    { value: timeLeft, label: "Time Left" },
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
      helperText: "The host running apcupsd (NIS server)",
    },
    {
      key: "port",
      label: "Port",
      type: "number",
      required: false,
      placeholder: "3551",
      helperText: "Default: 3551",
    },
  ],

  async fetchData() {
    // Note: This requires a proxy server that exposes apcupsd NIS over HTTP
    // You'll need to run apcaccess or a small daemon that provides this data
    // For now, we'll assume there's an HTTP endpoint that returns JSON

    // This is a placeholder - apcupsd uses a binary protocol on port 3551
    // In practice, you'd need apcaccess running locally or a REST wrapper
    // For Homepage compatibility, they use a TCP connection directly

    // Alternative: Use apcaccess command if running locally
    // For now, throw an error explaining the limitation
    throw new Error(
      "APC UPS requires a local apcaccess daemon. Configure apcupsd NIS server and ensure apcaccess can connect."
    )

    // If you have a REST wrapper, the implementation would look like:
    // const res = await fetch(`http://${host}:${port}/status`)
    // const data = await res.json()
    // return {
    //   _status: data.STATUS === 'ONLINE' ? 'ok' : 'warn',
    //   status: data.STATUS ?? 'UNKNOWN',
    //   load: `${data.LOADPCT ?? 0}%`,
    //   charge: `${data.BCHARGE ?? 0}%`,
    //   timeLeft: `${Math.floor((data.TIMELEFT ?? 0) * 60)} min`,
    // }
  },

  Widget: ApcupsWidget,
}
