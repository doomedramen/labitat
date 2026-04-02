import type { ServiceDefinition } from "./types"
import { StatGrid } from "./widgets"

type GenericRestData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  value: string
  label: string
}

function GenericRestWidget({ value, label }: GenericRestData) {
  return <StatGrid items={[{ value, label }]} />
}

export const genericRestDefinition: ServiceDefinition<GenericRestData> = {
  id: "generic-rest",
  name: "Generic REST",
  icon: "network",
  category: "monitoring",
  defaultPollingMs: 30_000,

  configFields: [
    {
      key: "url",
      label: "API URL",
      type: "url",
      required: true,
      placeholder: "http://10.0.0.1/api/status",
      helperText: "The full URL of the REST API endpoint",
    },
    {
      key: "method",
      label: "Method",
      type: "select",
      required: false,
      options: [
        { label: "GET", value: "GET" },
        { label: "POST", value: "POST" },
      ],
    },
    {
      key: "jsonPath",
      label: "JSON Path",
      type: "text",
      required: false,
      placeholder: "status",
      helperText:
        "Simple dot-notation path to extract value (e.g., data.status)",
    },
    {
      key: "label",
      label: "Display Label",
      type: "text",
      required: false,
      placeholder: "Status",
    },
    {
      key: "apiKey",
      label: "API Key (optional)",
      type: "password",
      required: false,
      placeholder: "Bearer token or API key",
    },
  ],

  async fetchData(config) {
    const url = config.url
    const method = config.method || "GET"
    const jsonPath = config.jsonPath || ""
    const label = config.label || "Value"

    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    if (config.apiKey) {
      headers.Authorization = `Bearer ${config.apiKey}`
    }

    try {
      const res = await fetch(url, {
        method,
        headers,
        body: method === "POST" ? "{}" : undefined,
      })

      if (!res.ok) {
        throw new Error(`HTTP ${res.status}`)
      }

      const data = await res.json()

      // Simple dot-notation JSON path extraction
      let value: string | number = "OK"
      if (jsonPath) {
        const keys = jsonPath.split(".")
        let result: unknown = data
        for (const key of keys) {
          if (result && typeof result === "object" && key in result) {
            result = (result as Record<string, unknown>)[key]
          } else {
            result = undefined
            break
          }
        }
        value = result !== undefined ? String(result) : "N/A"
      }

      return {
        _status: "ok" as const,
        value,
        label,
      }
    } catch (err) {
      return {
        _status: "error" as const,
        _statusText: err instanceof Error ? err.message : "Failed to fetch",
        value: "Error",
        label,
      }
    }
  },

  Widget: GenericRestWidget,
}
