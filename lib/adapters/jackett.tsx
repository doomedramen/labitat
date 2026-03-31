import type { ServiceDefinition } from "./types"

type JackettData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  configured: number
  errored: number
}

function JackettWidget({ configured, errored }: JackettData) {
  const items = [
    { value: configured, label: "Configured" },
    { value: errored, label: "Errored" },
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
      placeholder: "http://192.168.1.2:9117",
      helperText: "The base URL of your Jackett instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Jackett API key",
      helperText: "Found in Jackett UI → API Key",
    },
    {
      key: "password",
      label: "Admin Password",
      type: "password",
      required: false,
      placeholder: "Your Jackett admin password",
      helperText: "Required if Jackett has admin password enabled",
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

  Widget: JackettWidget,
}
