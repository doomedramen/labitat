import React from "react"
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { embyDefinition } from "@/lib/adapters/emby"
import { jellyfinDefinition } from "@/lib/adapters/jellyfin"
import { lidarrDefinition } from "@/lib/adapters/lidarr"
import { readarrDefinition } from "@/lib/adapters/readarr"
import { piholeDefinition } from "@/lib/adapters/pihole"
import { portainerDefinition } from "@/lib/adapters/portainer"
import { traefikDefinition } from "@/lib/adapters/traefik"
import { uptimeKumaDefinition } from "@/lib/adapters/uptime-kuma"
import { grafanaDefinition } from "@/lib/adapters/grafana"
import { genericPingDefinition } from "@/lib/adapters/generic-ping"
import { genericRestDefinition } from "@/lib/adapters/generic-rest"
import { transmissionDefinition } from "@/lib/adapters/transmission"
import { immichDefinition } from "@/lib/adapters/immich"
import { jackettDefinition } from "@/lib/adapters/jackett"
import { frigateDefinition } from "@/lib/adapters/frigate"
import { homeassistantDefinition } from "@/lib/adapters/homeassistant"

// Helper to test that specific text appears in the rendered output
function testWidgetRendersText<TProps extends object>(
  definition: { Widget: React.ComponentType<TProps> },
  props: TProps,
  expectedTexts: string[]
) {
  const { container } = render(React.createElement(definition.Widget, props))

  // Verify each expected text appears in the output
  for (const text of expectedTexts) {
    expect(container.textContent).toContain(text)
  }
}

describe("emby adapter (disabled)", () => {
  it("has correct definition", () => {
    expect(embyDefinition.id).toBe("emby")
    expect(embyDefinition.name).toBe("Emby")
    expect(embyDefinition.category).toBe("media")
    expect(embyDefinition.configFields).toHaveLength(2)
    expect(embyDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has required config fields", () => {
    const fields = embyDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(
      fields.some((f) => f.key === "apiKey" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      embyDefinition,
      {
        activeStreams: 3,
        movies: 150,
        shows: 25,
        episodes: 500,
      },
      ["3", "Active Streams", "150", "Movies", "25", "Shows", "500", "Episodes"]
    )
  })
})

describe("jellyfin adapter (disabled)", () => {
  it("has correct definition", () => {
    expect(jellyfinDefinition.id).toBe("jellyfin")
    expect(jellyfinDefinition.name).toBe("Jellyfin")
    expect(jellyfinDefinition.category).toBe("media")
    expect(jellyfinDefinition.configFields.length).toBeGreaterThanOrEqual(2)
    expect(jellyfinDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has required config fields", () => {
    const fields = jellyfinDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(
      fields.some((f) => f.key === "apiKey" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      jellyfinDefinition,
      {
        activeStreams: 2,
        movies: 100,
        shows: 20,
        episodes: 400,
      },
      ["2", "Active Streams", "100", "Movies", "20", "Shows", "400", "Episodes"]
    )
  })
})

describe("lidarr adapter (disabled)", () => {
  it("has correct definition", () => {
    expect(lidarrDefinition.id).toBe("lidarr")
    expect(lidarrDefinition.name).toBe("Lidarr")
    expect(lidarrDefinition.category).toBe("downloads")
    expect(lidarrDefinition.configFields).toHaveLength(2)
    expect(lidarrDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has required config fields", () => {
    const fields = lidarrDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(
      fields.some((f) => f.key === "apiKey" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      lidarrDefinition,
      {
        queued: 5,
        wanted: 15,
        artists: 50,
      },
      ["15", "Wanted", "5", "Queued", "50", "Artists"]
    )
  })
})

describe("readarr adapter (disabled)", () => {
  it("has correct definition", () => {
    expect(readarrDefinition.id).toBe("readarr")
    expect(readarrDefinition.name).toBe("Readarr")
    expect(readarrDefinition.category).toBe("downloads")
    expect(readarrDefinition.configFields).toHaveLength(2)
    expect(readarrDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has required config fields", () => {
    const fields = readarrDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(
      fields.some((f) => f.key === "apiKey" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      readarrDefinition,
      {
        queued: 3,
        wanted: 10,
        books: 75,
      },
      ["10", "Wanted", "3", "Queued", "75", "Books"]
    )
  })
})

describe("pihole adapter (disabled)", () => {
  it("has correct definition", () => {
    expect(piholeDefinition.id).toBe("pihole")
    expect(piholeDefinition.name).toBe("Pi-hole")
    expect(piholeDefinition.category).toBe("networking")
    expect(piholeDefinition.configFields).toHaveLength(2)
    expect(piholeDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has required config fields", () => {
    const fields = piholeDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(
      fields.some((f) => f.key === "password" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      piholeDefinition,
      {
        queries: 15000,
        blocked: 3500,
        percentBlocked: "23.3%",
        domainsBlocked: 125000,
      },
      [
        "15,000",
        "Queries",
        "3,500",
        "Blocked",
        "23.3%",
        "Blocked %",
        "125,000",
        "Domains",
      ]
    )
  })
})

describe("portainer adapter (disabled)", () => {
  it("has correct definition", () => {
    expect(portainerDefinition.id).toBe("portainer")
    expect(portainerDefinition.name).toBe("Portainer")
    expect(portainerDefinition.category).toBe("monitoring")
    expect(portainerDefinition.configFields.length).toBeGreaterThanOrEqual(3)
    expect(portainerDefinition.defaultPollingMs).toBe(15_000)
  })

  it("has required config fields", () => {
    const fields = portainerDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(fields.some((f) => f.key === "username" && f.type === "text")).toBe(
      true
    )
    expect(
      fields.some((f) => f.key === "password" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      portainerDefinition,
      {
        running: 15,
        stopped: 5,
        total: 20,
      },
      ["15", "Running", "5", "Stopped", "20", "Total"]
    )
  })
})

describe("traefik adapter (disabled)", () => {
  it("has correct definition", () => {
    expect(traefikDefinition.id).toBe("traefik")
    expect(traefikDefinition.name).toBe("Traefik")
    expect(traefikDefinition.category).toBe("networking")
    expect(traefikDefinition.configFields.length).toBeGreaterThanOrEqual(1)
    expect(traefikDefinition.defaultPollingMs).toBe(15_000)
  })

  it("has url config field", () => {
    const fields = traefikDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      traefikDefinition,
      {
        routers: 20,
        services: 25,
        middlewares: 10,
      },
      ["20", "Routers", "25", "Services", "10", "Middlewares"]
    )
  })
})

describe("uptime-kuma adapter (disabled)", () => {
  it("has correct definition", () => {
    expect(uptimeKumaDefinition.id).toBe("uptime-kuma")
    expect(uptimeKumaDefinition.name).toBe("Uptime Kuma")
    expect(uptimeKumaDefinition.category).toBe("monitoring")
    expect(uptimeKumaDefinition.configFields.length).toBeGreaterThanOrEqual(1)
    expect(uptimeKumaDefinition.defaultPollingMs).toBe(15_000)
  })

  it("has url config field", () => {
    const fields = uptimeKumaDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      uptimeKumaDefinition,
      {
        up: 18,
        down: 2,
        uptime: "95.5%",
      },
      ["18", "Up", "2", "Down", "95.5%", "Uptime"]
    )
  })
})

describe("grafana adapter (disabled)", () => {
  it("has correct definition", () => {
    expect(grafanaDefinition.id).toBe("grafana")
    expect(grafanaDefinition.name).toBe("Grafana")
    expect(grafanaDefinition.category).toBe("monitoring")
    expect(grafanaDefinition.configFields).toHaveLength(2)
    expect(grafanaDefinition.defaultPollingMs).toBe(15_000)
  })

  it("has required config fields", () => {
    const fields = grafanaDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(
      fields.some((f) => f.key === "apiKey" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      grafanaDefinition,
      {
        dashboards: 25,
        datasources: 10,
        totalAlerts: 15,
        alertsTriggered: 3,
      },
      [
        "25",
        "Dashboards",
        "10",
        "Datasources",
        "15",
        "Total Alerts",
        "3",
        "Alerts Triggered",
      ]
    )
  })
})

describe("generic-ping adapter (disabled)", () => {
  it("has correct definition", () => {
    expect(genericPingDefinition.id).toBe("generic-ping")
    expect(genericPingDefinition.name).toBe("Generic Ping")
    expect(genericPingDefinition.category).toBe("monitoring")
    expect(genericPingDefinition.configFields.length).toBeGreaterThanOrEqual(1)
    expect(genericPingDefinition.defaultPollingMs).toBe(30_000)
  })

  it("has url config field", () => {
    const fields = genericPingDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
  })

  it("renders widget when host is up", () => {
    testWidgetRendersText(
      genericPingDefinition,
      {
        status: "up",
        responseTime: 25,
      },
      ["✓", "Online", "25ms", "Response"]
    )
  })

  it("renders widget when host is down", () => {
    testWidgetRendersText(
      genericPingDefinition,
      {
        status: "down",
        responseTime: 0,
      },
      ["✗", "Offline", "0ms", "Response"]
    )
  })
})

describe("generic-rest adapter (disabled)", () => {
  it("has correct definition", () => {
    expect(genericRestDefinition.id).toBe("generic-rest")
    expect(genericRestDefinition.name).toBe("Generic REST")
    expect(genericRestDefinition.category).toBe("monitoring")
    expect(genericRestDefinition.configFields.length).toBeGreaterThanOrEqual(1)
    expect(genericRestDefinition.defaultPollingMs).toBe(30_000)
  })

  it("has url config field", () => {
    const fields = genericRestDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      genericRestDefinition,
      {
        value: "OK",
        label: "Status",
      },
      ["OK", "Status"]
    )
  })
})

describe("transmission adapter (disabled)", () => {
  it("has correct definition", () => {
    expect(transmissionDefinition.id).toBe("transmission")
    expect(transmissionDefinition.name).toBe("Transmission")
    expect(transmissionDefinition.category).toBe("downloads")
    expect(transmissionDefinition.configFields.length).toBeGreaterThanOrEqual(3)
    expect(transmissionDefinition.defaultPollingMs).toBe(5_000)
  })

  it("has required config fields", () => {
    const fields = transmissionDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(fields.some((f) => f.key === "username" && f.type === "text")).toBe(
      true
    )
    expect(
      fields.some((f) => f.key === "password" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      transmissionDefinition,
      {
        leech: 5,
        download: 3500000,
        seed: 20,
        upload: 1200000,
      },
      ["5", "Leech", "3.5 MB/s", "Download", "20", "Seed", "1.2 MB/s", "Upload"]
    )
  })
})

describe("immich adapter (disabled)", () => {
  it("has correct definition", () => {
    expect(immichDefinition.id).toBe("immich")
    expect(immichDefinition.name).toBe("Immich")
    expect(immichDefinition.category).toBe("media")
    expect(immichDefinition.configFields.length).toBeGreaterThanOrEqual(2)
    expect(immichDefinition.defaultPollingMs).toBe(60_000)
  })

  it("has required config fields", () => {
    const fields = immichDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(
      fields.some((f) => f.key === "apiKey" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      immichDefinition,
      {
        users: 3,
        photos: 5000,
        videos: 500,
        storage: 50000000000,
      },
      ["3", "Users", "5000", "Photos", "500", "Videos", "50.0 GB", "Storage"]
    )
  })
})

describe("jackett adapter (disabled)", () => {
  it("has correct definition", () => {
    expect(jackettDefinition.id).toBe("jackett")
    expect(jackettDefinition.name).toBe("Jackett")
    expect(jackettDefinition.category).toBe("downloads")
    expect(jackettDefinition.configFields.length).toBeGreaterThanOrEqual(2)
    expect(jackettDefinition.defaultPollingMs).toBe(30_000)
  })

  it("has required config fields", () => {
    const fields = jackettDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(
      fields.some((f) => f.key === "apiKey" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      jackettDefinition,
      {
        configured: 15,
        errored: 2,
      },
      ["15", "Configured", "2", "Errored"]
    )
  })
})

describe("frigate adapter (disabled)", () => {
  it("has correct definition", () => {
    expect(frigateDefinition.id).toBe("frigate")
    expect(frigateDefinition.name).toBe("Frigate")
    expect(frigateDefinition.category).toBe("monitoring")
    expect(frigateDefinition.configFields.length).toBeGreaterThanOrEqual(1)
    expect(frigateDefinition.defaultPollingMs).toBe(30_000)
  })

  it("has url config field", () => {
    const fields = frigateDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      frigateDefinition,
      {
        cameras: 8,
        uptime: 864000,
        version: "0.14.0",
      },
      ["8", "Cameras", "10d", "Uptime", "0.14.0", "Version"]
    )
  })
})

describe("homeassistant adapter (disabled)", () => {
  it("has correct definition", () => {
    expect(homeassistantDefinition.id).toBe("homeassistant")
    expect(homeassistantDefinition.name).toBe("Home Assistant")
    expect(homeassistantDefinition.category).toBe("automation")
    expect(homeassistantDefinition.configFields).toHaveLength(2)
    expect(homeassistantDefinition.defaultPollingMs).toBe(30_000)
  })

  it("has required config fields", () => {
    const fields = homeassistantDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(fields.some((f) => f.key === "token" && f.type === "password")).toBe(
      true
    )
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      homeassistantDefinition,
      {
        entities: 250,
        sensors: 100,
        lights: 50,
        switches: 30,
      },
      ["250", "Entities", "100", "Sensors", "50", "Lights", "30", "Switches"]
    )
  })
})
