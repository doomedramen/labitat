import type { ServiceDefinition } from "./types"

type HomeAssistantData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  entities: number
  sensors: number
  lights: number
  switches: number
}

function HomeAssistantWidget({
  entities,
  sensors,
  lights,
  switches,
}: HomeAssistantData) {
  const items = [
    { value: entities, label: "Entities" },
    { value: sensors, label: "Sensors" },
    { value: lights, label: "Lights" },
    { value: switches, label: "Switches" },
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

export const homeassistantDefinition: ServiceDefinition<HomeAssistantData> = {
  id: "homeassistant",
  name: "Home Assistant",
  icon: "home-assistant",
  category: "automation",
  defaultPollingMs: 30_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "http://homeassistant.local:8123",
      helperText: "The base URL of your Home Assistant instance",
    },
    {
      key: "token",
      label: "Long-Lived Access Token",
      type: "password",
      required: true,
      placeholder: "Your access token",
      helperText: "Created in Profile → Security → Long-Lived Access Tokens",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "")
    const headers = {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    }

    const res = await fetch(`${baseUrl}/api/states`, { headers })

    if (!res.ok) {
      if (res.status === 401) throw new Error("Invalid access token")
      if (res.status === 404)
        throw new Error("Home Assistant not found at this URL")
      throw new Error(`Home Assistant error: ${res.status}`)
    }

    const entities = await res.json()

    // Count by domain
    let sensors = 0
    let lights = 0
    let switches = 0

    for (const entity of entities) {
      const domain = entity.entity_id?.split(".")[0]
      if (domain === "sensor") sensors++
      else if (domain === "light") lights++
      else if (domain === "switch") switches++
    }

    return {
      _status: "ok" as const,
      entities: entities.length,
      sensors,
      lights,
      switches,
    }
  },

  Widget: HomeAssistantWidget,
}
