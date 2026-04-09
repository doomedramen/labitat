import type { ServiceDefinition } from "./types"
import { Settings, AlertCircle } from "lucide-react"

type JackettData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  configured: number
  errored: number
}

function jackettToPayload(data: JackettData) {
  return {
    stats: [
      {
        id: "configured",
        value: (data.configured ?? 0).toLocaleString(),
        label: "Configured",
        icon: Settings,
      },
      {
        id: "errored",
        value: (data.errored ?? 0).toLocaleString(),
        label: "Errored",
        icon: AlertCircle,
      },
    ],
  }
}

export const jackettDefinition: ServiceDefinition<JackettData> = {
  id: "jackett",
  name: "Jackett",
  icon: "jackett",
  category: "downloads",
  defaultPollingMs: 30_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://jackett.example.org",
      helperText: "The base URL of your Jackett instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Jackett password or API key",
    },
    {
      key: "password",
      label: "Admin Password",
      type: "password",
      required: false,
      placeholder: "Your Jackett admin password",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    }

    // If password is set, we need to authenticate first to get cookie
    if (config.password) {
      const loginUrl = `${baseUrl}/UI/Dashboard`
      const loginRes = await fetch(loginUrl, {
        method: "POST",
        headers: {
          "Content-Type": "application/x-www-form-urlencoded",
        },
        body: `password=${encodeURIComponent(config.password)}`,
      })

      if (!loginRes.ok) {
        throw new Error("Failed to authenticate with Jackett")
      }

      const cookie = loginRes.headers.get("set-cookie")
      if (cookie) {
        headers.Cookie = cookie
      }
    }

    // Fetch configured indexers
    const indexersRes = await fetch(
      `${baseUrl}/api/v2.0/indexers?apikey=${config.apiKey}&configured=true`,
      { headers }
    )

    if (!indexersRes.ok) {
      if (indexersRes.status === 401) throw new Error("Invalid API key")
      if (indexersRes.status === 404)
        throw new Error("Jackett not found at this URL")
      throw new Error(`Jackett error: ${indexersRes.status}`)
    }

    const indexersData = await indexersRes.json()

    // Count errored indexers (those with last_error set)
    const errored = indexersData.filter(
      (i: { last_error: unknown }) => i.last_error
    ).length

    return {
      _status: "ok" as const,
      configured: indexersData.length ?? 0,
      errored,
    }
  },

  toPayload: jackettToPayload,
}
