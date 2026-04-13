import type { ServiceDefinition } from "./types";
import { Box, Gauge, Lightbulb, ToggleRight } from "lucide-react";

type HomeAssistantData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  entities: number;
  sensors: number;
  lights: number;
  switches: number;
};
import { fetchWithTimeout } from "./fetch-with-timeout";

function homeassistantToPayload(data: HomeAssistantData) {
  return {
    stats: [
      {
        id: "entities",
        value: (data.entities ?? 0).toLocaleString(),
        label: "Entities",
        icon: Box,
      },
      {
        id: "sensors",
        value: (data.sensors ?? 0).toLocaleString(),
        label: "Sensors",
        icon: Gauge,
      },
      {
        id: "lights",
        value: (data.lights ?? 0).toLocaleString(),
        label: "Lights",
        icon: Lightbulb,
      },
      {
        id: "switches",
        value: (data.switches ?? 0).toLocaleString(),
        label: "Switches",
        icon: ToggleRight,
      },
    ],
  };
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
      placeholder: "https://homeassistant.example.org",
      helperText: "The base URL of your Home Assistant instance",
    },
    {
      key: "token",
      label: "Long-Lived Access Token",
      type: "password",
      required: true,
      placeholder: "Your Home Assistant access token",
      helperText: "Created in Profile → Security → Long-Lived Access Tokens",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "");
    const headers = {
      Authorization: `Bearer ${config.token}`,
      "Content-Type": "application/json",
    };

    const res = await fetchWithTimeout(`${baseUrl}/api/states`, { headers });

    if (!res.ok) {
      if (res.status === 401) throw new Error("Invalid access token");
      if (res.status === 404) throw new Error("Home Assistant not found at this URL");
      throw new Error(`Home Assistant error: ${res.status}`);
    }

    const entities = await res.json();

    // Count by domain
    let sensors = 0;
    let lights = 0;
    let switches = 0;

    for (const entity of entities) {
      const domain = entity.entity_id?.split(".")[0];
      if (domain === "sensor") sensors++;
      else if (domain === "light") lights++;
      else if (domain === "switch") switches++;
    }

    return {
      _status: "ok" as const,
      entities: entities.length,
      sensors,
      lights,
      switches,
    };
  },

  toPayload: homeassistantToPayload,
};
