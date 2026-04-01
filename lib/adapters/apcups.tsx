import type { ServiceDefinition } from "./types"
import { getApcupsStatus } from "../actions/apcups"
import { StatGrid } from "./widgets"

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

  return <StatGrid items={items} />
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
    const host = config.host ?? "127.0.0.1"
    const port = parseInt(config.port ?? "3551", 10)

    try {
      const data = await getApcupsStatus(host, port)

      return {
        _status: data.STATUS === "ONLINE" ? "ok" : ("warn" as const),
        status: data.STATUS ?? "UNKNOWN",
        load: data.LOADPCT ?? "0",
        charge: data.BCHARGE ?? "0",
        timeLeft: data.TIMELEFT ?? "0",
      }
    } catch (error) {
      const err = error as Error
      throw new Error(`APC UPS connection failed: ${err.message}`)
    }
  },

  Widget: ApcupsWidget,
}
