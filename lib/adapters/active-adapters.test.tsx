import React from "react"
import { describe, it, expect } from "vitest"
import { render } from "@testing-library/react"
import { radarrDefinition } from "@/lib/adapters/radarr"
import { sonarrDefinition } from "@/lib/adapters/sonarr"
import { prowlarrDefinition } from "@/lib/adapters/prowlarr"
import { seerrDefinition } from "@/lib/adapters/seerr"
import { sabnzbdDefinition } from "@/lib/adapters/sabnzbd"
import { qbittorrentDefinition } from "@/lib/adapters/qbittorrent"
import { adguardDefinition } from "@/lib/adapters/adguard"
import { bazarrDefinition } from "@/lib/adapters/bazarr"
import { tautulliDefinition } from "@/lib/adapters/tautulli"
import { plexDefinition } from "@/lib/adapters/plex"
import { unmanicDefinition } from "@/lib/adapters/unmanic"
import { apcupsDefinition } from "@/lib/adapters/apcups"
import { unifiDefinition } from "@/lib/adapters/unifi"
import { nginxProxyManagerDefinition } from "@/lib/adapters/nginx-proxy-manager"

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

describe("radarr adapter", () => {
  it("has correct definition", () => {
    expect(radarrDefinition.id).toBe("radarr")
    expect(radarrDefinition.name).toBe("Radarr")
    expect(radarrDefinition.category).toBe("downloads")
    expect(radarrDefinition.configFields).toHaveLength(2)
    expect(radarrDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has required config fields", () => {
    const fields = radarrDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(
      fields.some((f) => f.key === "apiKey" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      radarrDefinition,
      {
        wanted: 10,
        missing: 5,
        queued: 2,
        movies: 100,
      },
      ["10", "Wanted", "5", "Missing", "2", "Queued", "100", "Movies"]
    )
  })

  it("fetchData throws on invalid URL", async () => {
    await expect(
      radarrDefinition.fetchData?.({ url: "invalid", apiKey: "test" })
    ).rejects.toThrow()
  })
})

describe("sonarr adapter", () => {
  it("has correct definition", () => {
    expect(sonarrDefinition.id).toBe("sonarr")
    expect(sonarrDefinition.name).toBe("Sonarr")
    expect(sonarrDefinition.category).toBe("downloads")
    expect(sonarrDefinition.configFields).toHaveLength(2)
    expect(sonarrDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has required config fields", () => {
    const fields = sonarrDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(
      fields.some((f) => f.key === "apiKey" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      sonarrDefinition,
      {
        wanted: 15,
        queued: 3,
        series: 25,
      },
      ["15", "Wanted", "3", "Queued", "25", "Series"]
    )
  })

  it("fetchData throws on invalid URL", async () => {
    await expect(
      sonarrDefinition.fetchData?.({ url: "invalid", apiKey: "test" })
    ).rejects.toThrow()
  })
})

describe("prowlarr adapter", () => {
  it("has correct definition", () => {
    expect(prowlarrDefinition.id).toBe("prowlarr")
    expect(prowlarrDefinition.name).toBe("Prowlarr")
    expect(prowlarrDefinition.category).toBe("downloads")
    expect(prowlarrDefinition.configFields).toHaveLength(2)
    expect(prowlarrDefinition.defaultPollingMs).toBe(30_000)
  })

  it("has required config fields", () => {
    const fields = prowlarrDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(
      fields.some((f) => f.key === "apiKey" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      prowlarrDefinition,
      {
        grabs: 150,
        queries: 300,
        failedGrabs: 5,
        failedQueries: 10,
      },
      [
        "150",
        "Grabs",
        "300",
        "Queries",
        "5",
        "Fail Grabs",
        "10",
        "Fail Queries",
      ]
    )
  })
})

describe("seerr adapter", () => {
  it("has correct definition", () => {
    expect(seerrDefinition.id).toBe("seerr")
    expect(seerrDefinition.name).toBe("Seerr")
    expect(seerrDefinition.category).toBe("media")
    expect(seerrDefinition.configFields).toHaveLength(2)
    expect(seerrDefinition.defaultPollingMs).toBe(30_000)
  })

  it("has required config fields", () => {
    const fields = seerrDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(
      fields.some((f) => f.key === "apiKey" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      seerrDefinition,
      {
        pending: 5,
        processing: 10,
        approved: 8,
        available: 12,
      },
      ["5", "Pending", "10", "Processing", "8", "Approved", "12", "Available"]
    )
  })
})

describe("sabnzbd adapter", () => {
  it("has correct definition", () => {
    expect(sabnzbdDefinition.id).toBe("sabnzbd")
    expect(sabnzbdDefinition.name).toBe("SABnzbd")
    expect(sabnzbdDefinition.category).toBe("downloads")
    expect(sabnzbdDefinition.configFields).toHaveLength(3)
    expect(sabnzbdDefinition.defaultPollingMs).toBe(5_000)
  })

  it("has required config fields", () => {
    const fields = sabnzbdDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(
      fields.some((f) => f.key === "apiKey" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      sabnzbdDefinition,
      {
        queue: 5,
        speed: "10.5 MB/s",
        timeleft: "2:30:00",
      },
      ["10.5 MB/s", "Speed", "5", "Queue", "2:30:00", "Time Left"]
    )
  })
})

describe("qbittorrent adapter", () => {
  it("has correct definition", () => {
    expect(qbittorrentDefinition.id).toBe("qbittorrent")
    expect(qbittorrentDefinition.name).toBe("qBittorrent")
    expect(qbittorrentDefinition.category).toBe("downloads")
    expect(qbittorrentDefinition.configFields).toHaveLength(4)
    expect(qbittorrentDefinition.defaultPollingMs).toBe(5_000)
  })

  it("has required config fields", () => {
    const fields = qbittorrentDefinition.configFields
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
      qbittorrentDefinition,
      {
        leech: 3,
        download: 5200000,
        seed: 10,
        upload: 1100000,
      },
      ["3", "Leech", "5.2 MB/s", "Download", "10", "Seed", "1.1 MB/s", "Upload"]
    )
  })
})

describe("adguard adapter", () => {
  it("has correct definition", () => {
    expect(adguardDefinition.id).toBe("adguard")
    expect(adguardDefinition.name).toBe("AdGuard Home")
    expect(adguardDefinition.category).toBe("networking")
    expect(adguardDefinition.configFields).toHaveLength(3)
    expect(adguardDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has required config fields", () => {
    const fields = adguardDefinition.configFields
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
      adguardDefinition,
      {
        queries: 10000,
        blocked: 2500,
        filtered: 500,
        latency: 15.5,
      },
      [
        "10,000",
        "Queries",
        "2,500",
        "Blocked",
        "500",
        "Filtered",
        "16ms",
        "Latency",
      ]
    )
  })
})

describe("bazarr adapter", () => {
  it("has correct definition", () => {
    expect(bazarrDefinition.id).toBe("bazarr")
    expect(bazarrDefinition.name).toBe("Bazarr")
    expect(bazarrDefinition.category).toBe("downloads")
    expect(bazarrDefinition.configFields).toHaveLength(2)
    expect(bazarrDefinition.defaultPollingMs).toBe(30_000)
  })

  it("has required config fields", () => {
    const fields = bazarrDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(
      fields.some((f) => f.key === "apiKey" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      bazarrDefinition,
      {
        wantedMovies: 20,
        wantedEpisodes: 35,
      },
      ["20", "Movies Missing", "35", "Episodes Missing"]
    )
  })
})

describe("tautulli adapter", () => {
  it("has correct definition", () => {
    expect(tautulliDefinition.id).toBe("tautulli")
    expect(tautulliDefinition.name).toBe("Tautulli")
    expect(tautulliDefinition.category).toBe("media")
    expect(tautulliDefinition.configFields).toHaveLength(3)
    expect(tautulliDefinition.defaultPollingMs).toBe(5_000)
  })

  it("has required config fields", () => {
    const fields = tautulliDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(
      fields.some((f) => f.key === "apiKey" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      tautulliDefinition,
      {
        showActiveStreams: false,
        sessions: [],
      },
      ["-"]
    )
  })
})

describe("plex adapter", () => {
  it("has correct definition", () => {
    expect(plexDefinition.id).toBe("plex")
    expect(plexDefinition.name).toBe("Plex")
    expect(plexDefinition.category).toBe("media")
    expect(plexDefinition.configFields).toHaveLength(3)
    expect(plexDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has required config fields", () => {
    const fields = plexDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(fields.some((f) => f.key === "token" && f.type === "password")).toBe(
      true
    )
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      plexDefinition,
      {
        streams: 3,
        albums: 15,
        movies: 50,
        tvShows: 10,
        showActiveStreams: false,
        sessions: [],
      },
      ["3", "Active Streams", "15", "Albums", "50", "Movies", "10", "TV Shows"]
    )
  })
})

describe("unmanic adapter", () => {
  it("has correct definition", () => {
    expect(unmanicDefinition.id).toBe("unmanic")
    expect(unmanicDefinition.name).toBe("Unmanic")
    expect(unmanicDefinition.category).toBe("media")
    expect(unmanicDefinition.configFields).toHaveLength(1)
    expect(unmanicDefinition.defaultPollingMs).toBe(10_000)
  })

  it("has required config fields", () => {
    const fields = unmanicDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      unmanicDefinition,
      {
        activeWorkers: 2,
        totalWorkers: 4,
        queueLength: 5,
      },
      ["2", "Active Workers", "4", "Total Workers", "5", "Queue Length"]
    )
  })
})

describe("apcups adapter", () => {
  it("has correct definition", () => {
    expect(apcupsDefinition.id).toBe("apcups")
    expect(apcupsDefinition.name).toBe("APC UPS")
    expect(apcupsDefinition.category).toBe("monitoring")
    expect(apcupsDefinition.configFields.length).toBeGreaterThanOrEqual(1)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      apcupsDefinition,
      {
        status: "ONLINE",
        load: "45.2",
        charge: "100",
        timeLeft: "30",
      },
      [
        "ONLINE",
        "Status",
        "45.2%",
        "Load",
        "100%",
        "Battery",
        "30 min",
        "Time Left",
      ]
    )
  })
})

describe("unifi adapter", () => {
  it("has correct definition", () => {
    expect(unifiDefinition.id).toBe("unifi")
    expect(unifiDefinition.name).toBe("UniFi")
    expect(unifiDefinition.category).toBe("networking")
    expect(unifiDefinition.configFields.length).toBeGreaterThanOrEqual(2)
  })

  it("has required config fields", () => {
    const fields = unifiDefinition.configFields
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
      unifiDefinition,
      {
        uptime: "15d",
        wan: "UP",
        lanUsers: 15,
        wlanUsers: 8,
      },
      ["15d", "Uptime", "UP", "WAN", "15", "LAN Users", "8", "WLAN Users"]
    )
  })
})

describe("nginx-proxy-manager adapter", () => {
  it("has correct definition", () => {
    expect(nginxProxyManagerDefinition.id).toBe("nginx-proxy-manager")
    expect(nginxProxyManagerDefinition.name).toBe("Nginx Proxy Manager")
    expect(nginxProxyManagerDefinition.category).toBe("networking")
    expect(
      nginxProxyManagerDefinition.configFields.length
    ).toBeGreaterThanOrEqual(2)
  })

  it("has required config fields", () => {
    const fields = nginxProxyManagerDefinition.configFields
    expect(fields.some((f) => f.key === "url" && f.type === "url")).toBe(true)
    expect(fields.some((f) => f.key === "email" && f.type === "text")).toBe(
      true
    )
    expect(
      fields.some((f) => f.key === "password" && f.type === "password")
    ).toBe(true)
  })

  it("renders widget with data", () => {
    testWidgetRendersText(
      nginxProxyManagerDefinition,
      {
        enabled: 8,
        disabled: 2,
        total: 10,
      },
      ["8", "Enabled", "2", "Disabled", "10", "Total"]
    )
  })
})
