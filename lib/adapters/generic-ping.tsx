import type { ServiceDefinition } from "./types"
import { cn } from "@/lib/utils"

type GenericPingData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  status: "up" | "down"
  responseTime: number
}

function GenericPingWidget({ status, responseTime }: GenericPingData) {
  const items = [
    {
      value: status === "up" ? "✓" : "✗",
      label: status === "up" ? "Online" : "Offline",
    },
    { value: `${responseTime}ms`, label: "Response" },
  ]

  return (
    <div className="grid grid-cols-[repeat(auto-fit,minmax(60px,1fr))] gap-1.5 text-xs">
      {items.map((item) => (
        <div
          key={item.label}
          className="flex flex-col items-center rounded-md bg-muted/50 px-2 py-1 text-center"
        >
          <span
            className={cn(
              "font-medium tabular-nums",
              status === "up" ? "text-green-500" : "text-red-500"
            )}
          >
            {item.value}
          </span>
          <span className="text-muted-foreground">{item.label}</span>
        </div>
      ))}
    </div>
  )
}

export const genericPingDefinition: ServiceDefinition<GenericPingData> = {
  id: "generic-ping",
  name: "Generic Ping",
  icon: "network",
  category: "monitoring",
  defaultPollingMs: 30_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "http://192.168.1.1",
      helperText: "The URL or IP to ping",
    },
    {
      key: "timeout",
      label: "Timeout (ms)",
      type: "number",
      required: false,
      placeholder: "5000",
      helperText: "Request timeout in milliseconds (default: 5000)",
    },
  ],

  async fetchData(config) {
    const url = config.url
    const timeout = parseInt(config.timeout || "5000", 10)

    const startTime = Date.now()

    try {
      const controller = new AbortController()
      const timeoutId = setTimeout(() => controller.abort(), timeout)

      await fetch(url, {
        method: "HEAD",
        signal: controller.signal,
        cache: "no-cache",
      })

      clearTimeout(timeoutId)
      const responseTime = Date.now() - startTime

      return {
        _status: "ok" as const,
        status: "up" as const,
        responseTime,
      }
    } catch (err) {
      return {
        _status: "error" as const,
        _statusText: err instanceof Error ? err.message : "Host unreachable",
        status: "down" as const,
        responseTime: 0,
      }
    }
  },

  Widget: GenericPingWidget,
}
