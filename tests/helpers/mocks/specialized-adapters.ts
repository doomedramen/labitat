/**
 * Mock data for specialized and remaining adapters (Emby, Jellyfin, Immich, Frigate, Home Assistant, Grafana, Uptime Kuma, Matrix, DateTime, Search, Pipes, Generic)
 */

import type { MockResponse } from "../adapter-mocks"
import {
  successResponse,
  urlPatterns,
  networkErrorResponse,
} from "../adapter-mocks"

// ── Emby Mocks ──────────────────────────────────────────────────────────────────

export const embyMocks = {
  success: (
    baseUrl = "https://emby.example.com",
    opts?: {
      streams?: number
      albums?: number
      movies?: number
      tvShows?: number
      sessions?: Array<{
        name: string
        seriesName?: string
        type: string
        playState: {
          positionTicks: number
          durationTicks: number
          isPaused: boolean
        }
        userName: string
      }>
    }
  ): MockResponse[] => {
    const sessions = opts?.sessions || []

    return [
      successResponse(
        urlPatterns.withQuery(baseUrl, "/Sessions", {}),
        sessions.map((s) => ({
          Id: `session-${Math.random()}`,
          NowPlayingItem: {
            Name: s.name,
            SeriesName: s.seriesName,
            Type: s.type,
          },
          PlayState: s.playState,
          UserName: s.userName,
        }))
      ),
      successResponse(
        urlPatterns.withQuery(baseUrl, "/Items", {
          IncludeItemTypes: "Movie",
          Recursive: "true",
          Fields: "",
        }),
        { TotalRecordCount: opts?.movies ?? 100, Items: [] }
      ),
      successResponse(
        urlPatterns.withQuery(baseUrl, "/Items", {
          IncludeItemTypes: "Series",
          Recursive: "true",
          Fields: "",
        }),
        { TotalRecordCount: opts?.tvShows ?? 25, Items: [] }
      ),
      successResponse(
        urlPatterns.withQuery(baseUrl, "/Items", {
          IncludeItemTypes: "MusicAlbum",
          Recursive: "true",
          Fields: "",
        }),
        { TotalRecordCount: opts?.albums ?? 50, Items: [] }
      ),
    ]
  },

  empty: (baseUrl = "https://emby.example.com"): MockResponse[] => [
    successResponse(urlPatterns.withQuery(baseUrl, "/Sessions", {}), []),
    successResponse(
      urlPatterns.withQuery(baseUrl, "/Items", {
        IncludeItemTypes: "Movie",
        Recursive: "true",
        Fields: "",
      }),
      { TotalRecordCount: 0, Items: [] }
    ),
    successResponse(
      urlPatterns.withQuery(baseUrl, "/Items", {
        IncludeItemTypes: "Series",
        Recursive: "true",
        Fields: "",
      }),
      { TotalRecordCount: 0, Items: [] }
    ),
    successResponse(
      urlPatterns.withQuery(baseUrl, "/Items", {
        IncludeItemTypes: "MusicAlbum",
        Recursive: "true",
        Fields: "",
      }),
      { TotalRecordCount: 0, Items: [] }
    ),
  ],

  error: (baseUrl = "https://emby.example.com", status = 500): MockResponse =>
    successResponse(
      urlPatterns.withQuery(baseUrl, "/Sessions", {}),
      { error: `Emby error: ${status}` },
      status
    ),
}

// ── Jellyfin Mocks ──────────────────────────────────────────────────────────────

export const jellyfinMocks = {
  success: (
    baseUrl = "https://jellyfin.example.com",
    opts?: {
      streams?: number
      albums?: number
      movies?: number
      tvShows?: number
      sessions?: Array<{
        name: string
        seriesName?: string
        type: string
        playState: {
          positionTicks: number
          durationTicks: number
          isPaused: boolean
        }
        userName: string
      }>
    }
  ): MockResponse[] => {
    const sessions = opts?.sessions || []

    return [
      successResponse(
        urlPatterns.contains("/Sessions"),
        sessions.map((s) => ({
          Id: `session-${Math.random()}`,
          NowPlayingItem: {
            Name: s.name,
            SeriesName: s.seriesName,
            Type: s.type,
          },
          PlayState: s.playState,
          UserName: s.userName,
        }))
      ),
      successResponse(
        urlPatterns.withQuery(baseUrl, "/Items", {
          IncludeItemTypes: "Movie",
          Recursive: "true",
          Fields: "",
        }),
        { TotalRecordCount: opts?.movies ?? 150, Items: [] }
      ),
      successResponse(
        urlPatterns.withQuery(baseUrl, "/Items", {
          IncludeItemTypes: "Series",
          Recursive: "true",
          Fields: "",
        }),
        { TotalRecordCount: opts?.tvShows ?? 30, Items: [] }
      ),
      successResponse(
        urlPatterns.withQuery(baseUrl, "/Items", {
          IncludeItemTypes: "MusicAlbum",
          Recursive: "true",
          Fields: "",
        }),
        { TotalRecordCount: opts?.albums ?? 75, Items: [] }
      ),
    ]
  },

  empty: (baseUrl = "https://jellyfin.example.com"): MockResponse[] => [
    successResponse(urlPatterns.contains("/Sessions"), []),
    successResponse(
      urlPatterns.withQuery(baseUrl, "/Items", {
        IncludeItemTypes: "Movie",
        Recursive: "true",
        Fields: "",
      }),
      { TotalRecordCount: 0, Items: [] }
    ),
    successResponse(
      urlPatterns.withQuery(baseUrl, "/Items", {
        IncludeItemTypes: "Series",
        Recursive: "true",
        Fields: "",
      }),
      { TotalRecordCount: 0, Items: [] }
    ),
    successResponse(
      urlPatterns.withQuery(baseUrl, "/Items", {
        IncludeItemTypes: "MusicAlbum",
        Recursive: "true",
        Fields: "",
      }),
      { TotalRecordCount: 0, Items: [] }
    ),
  ],

  error: (
    baseUrl = "https://jellyfin.example.com",
    status = 500
  ): MockResponse =>
    successResponse(
      urlPatterns.contains("/Sessions"),
      { error: `Jellyfin error: ${status}` },
      status
    ),
}

// ── Immich Mocks ────────────────────────────────────────────────────────────────

export const immichMocks = {
  success: (
    baseUrl = "https://immich.example.com",
    opts?: {
      photos?: number
      videos?: number
      usage?: number
      usageByUser?: Array<{
        userName: string
        photos: number
        videos: number
        usage: number
      }>
    }
  ): MockResponse[] => {
    const users = opts?.usageByUser || [
      {
        userName: "Admin",
        photos: opts?.photos ?? 5000,
        videos: opts?.videos ?? 200,
        usage: opts?.usage ?? 53687091200,
      },
    ]

    return [
      successResponse(urlPatterns.contains("/api/server-info/statistics"), {
        photos: opts?.photos ?? 5000,
        videos: opts?.videos ?? 200,
        usage: opts?.usage ?? 53687091200,
        usageByUser: users,
      }),
    ]
  },

  empty: (baseUrl = "https://immich.example.com"): MockResponse[] => [
    successResponse(urlPatterns.contains("/api/server-info/statistics"), {
      photos: 0,
      videos: 0,
      usage: 0,
      usageByUser: [],
    }),
  ],

  error: (baseUrl = "https://immich.example.com", status = 500): MockResponse =>
    successResponse(
      urlPatterns.contains("/api/server-info/statistics"),
      { error: `Immich error: ${status}` },
      status
    ),
}

// ── Frigate Mocks ───────────────────────────────────────────────────────────────

export const frigateMocks = {
  success: (
    baseUrl = "https://frigate.example.com",
    opts?: {
      cameras?: number
      detections?: number
      cpuPercent?: number
      memoryPercent?: number
      cameraStats?: Array<{
        camera: string
        fps: number
        skipped: number
        detectionEnabled: boolean
      }>
    }
  ): MockResponse[] => {
    const cameras = opts?.cameraStats || []

    return [
      successResponse(urlPatterns.contains("/api/stats"), {
        cameras: cameras.map((c) => ({
          camera: c.camera,
          fps: c.fps,
          detection_fps: c.fps,
          pid: 123,
          process_fps: c.fps,
          skipped_fps: c.skipped,
          detection_enabled: c.detectionEnabled,
        })),
        service: {
          cpus: [{ cpu: 25.5 }, { cpu: 30.2 }],
          mem: {
            home: opts?.memoryPercent ?? 45.0,
          },
        },
        detection_fps: opts?.detections ?? 15.5,
      }),
      successResponse(urlPatterns.contains("/api/config"), {
        cameras: Array.from({ length: opts?.cameras ?? 4 }, (_, i) => ({
          name: `camera-${i}`,
          detect: { enabled: true },
        })),
      }),
    ]
  },

  empty: (baseUrl = "https://frigate.example.com"): MockResponse[] => [
    successResponse(urlPatterns.contains("/api/stats"), {
      cameras: [],
      service: { cpus: [], mem: { home: 0 } },
      detection_fps: 0,
    }),
    successResponse(urlPatterns.contains("/api/config"), { cameras: [] }),
  ],

  error: (
    baseUrl = "https://frigate.example.com",
    status = 500
  ): MockResponse =>
    successResponse(
      urlPatterns.contains("/api/stats"),
      { error: `Frigate error: ${status}` },
      status
    ),
}

// ── Home Assistant Mocks ────────────────────────────────────────────────────────

export const homeassistantMocks = {
  success: (
    baseUrl = "https://hass.example.com",
    opts?: {
      temperature?: number
      humidity?: number
      lightsOn?: number
      totalLights?: number
      motionDetected?: boolean
    }
  ): MockResponse[] => [
    successResponse(urlPatterns.contains("/api/states"), [
      {
        entity_id: "sensor.temperature",
        state: String(opts?.temperature ?? 22.5),
        attributes: { unit_of_measurement: "°C" },
      },
      {
        entity_id: "sensor.humidity",
        state: String(opts?.humidity ?? 55),
        attributes: { unit_of_measurement: "%" },
      },
      {
        entity_id: "binary_sensor.motion",
        state: opts?.motionDetected ? "on" : "off",
        attributes: {},
      },
      ...Array.from({ length: opts?.totalLights ?? 10 }, (_, i) => ({
        entity_id: `light.light_${i}`,
        state: i < (opts?.lightsOn ?? 3) ? "on" : "off",
        attributes: {},
      })),
    ]),
  ],

  empty: (baseUrl = "https://hass.example.com"): MockResponse[] => [
    successResponse(urlPatterns.contains("/api/states"), []),
  ],

  error: (baseUrl = "https://hass.example.com", status = 500): MockResponse =>
    successResponse(
      urlPatterns.contains("/api/states"),
      { error: `Home Assistant error: ${status}` },
      status
    ),

  unauthorized: (baseUrl = "https://hass.example.com"): MockResponse =>
    successResponse(
      urlPatterns.contains("/api/states"),
      { error: "Unauthorized" },
      401
    ),
}

// ── Grafana Mocks ───────────────────────────────────────────────────────────────

export const grafanaMocks = {
  success: (
    baseUrl = "https://grafana.example.com",
    opts?: {
      dashboards?: number
      alerts?: number
      alertsFiring?: number
    }
  ): MockResponse[] => [
    successResponse(
      urlPatterns.contains("/api/search"),
      Array.from({ length: opts?.dashboards ?? 15 }, (_, i) => ({
        id: i + 1,
        uid: `dashboard-${i}`,
        title: `Dashboard ${i + 1}`,
        type: "dash-db",
      }))
    ),
    successResponse(
      urlPatterns.contains("/api/alerts"),
      Array.from({ length: opts?.alerts ?? 5 }, (_, i) => ({
        id: i + 1,
        name: `Alert ${i + 1}`,
        state: i < (opts?.alertsFiring ?? 2) ? "alerting" : "ok",
      }))
    ),
  ],

  empty: (baseUrl = "https://grafana.example.com"): MockResponse[] => [
    successResponse(urlPatterns.contains("/api/search"), []),
    successResponse(urlPatterns.contains("/api/alerts"), []),
  ],

  error: (
    baseUrl = "https://grafana.example.com",
    status = 500
  ): MockResponse =>
    successResponse(
      urlPatterns.contains("/api/search"),
      { error: `Grafana error: ${status}` },
      status
    ),
}

// ── Uptime Kuma Mocks ───────────────────────────────────────────────────────────

export const uptimeKumaMocks = {
  success: (
    baseUrl = "https://uptime-kuma.example.com",
    opts?: {
      monitors?: number
      upMonitors?: number
      downMonitors?: number
      pausedMonitors?: number
    }
  ): MockResponse[] => [
    successResponse(urlPatterns.contains("/api/status-page"), {
      monitorList: Array.from({ length: opts?.monitors ?? 10 }, (_, i) => ({
        id: i + 1,
        name: `Monitor ${i + 1}`,
        status:
          i < (opts?.upMonitors ?? 7)
            ? 2
            : i < (opts?.upMonitors ?? 7) + (opts?.downMonitors ?? 2)
              ? 0
              : 1,
      })),
    }),
  ],

  empty: (baseUrl = "https://uptime-kuma.example.com"): MockResponse[] => [
    successResponse(urlPatterns.contains("/api/status-page"), {
      monitorList: [],
    }),
  ],

  error: (
    baseUrl = "https://uptime-kuma.example.com",
    status = 500
  ): MockResponse =>
    successResponse(
      urlPatterns.contains("/api/status-page"),
      { error: `Uptime Kuma error: ${status}` },
      status
    ),
}

// ── Matrix Mocks ────────────────────────────────────────────────────────────────

export const matrixMocks = {
  success: (
    baseUrl = "https://matrix.example.com",
    opts?: {
      messages?: number
      rooms?: number
    }
  ): MockResponse[] => [
    successResponse(urlPatterns.contains("/_matrix/client/r0/publicRooms"), {
      chunk: Array.from({ length: opts?.rooms ?? 5 }, (_, i) => ({
        room_id: `!room${i}:example.com`,
        name: `Room ${i + 1}`,
        num_joined_members: Math.floor(Math.random() * 100),
      })),
      total_room_count_estimate: opts?.rooms ?? 5,
    }),
  ],

  empty: (baseUrl = "https://matrix.example.com"): MockResponse[] => [
    successResponse(urlPatterns.contains("/_matrix/client/r0/publicRooms"), {
      chunk: [],
      total_room_count_estimate: 0,
    }),
  ],

  error: (baseUrl = "https://matrix.example.com", status = 500): MockResponse =>
    successResponse(
      urlPatterns.contains("/_matrix/client/r0/publicRooms"),
      { error: `Matrix error: ${status}` },
      status
    ),
}

// ── DateTime Mocks (Client-side, no API calls) ──────────────────────────────────

export const datetimeMocks = {
  // DateTime is client-side only, no mocks needed
  note: "DateTime adapter is client-side only and does not make API calls",
}

// ── Search Mocks (Client-side) ──────────────────────────────────────────────────

export const searchMocks = {
  // Search is client-side only, no mocks needed
  note: "Search adapter is client-side only and does not make API calls",
}

// ── Pipes Mocks (Client-side) ───────────────────────────────────────────────────

export const pipesMocks = {
  // Pipes is client-side only, no mocks needed
  note: "Pipes adapter is client-side only and does not make API calls",
}

// ── Generic Ping Mocks ──────────────────────────────────────────────────────────

export const genericPingMocks = {
  success: (
    _baseUrl = "https://example.com",
    _latency = 150
  ): MockResponse[] => [
    successResponse(urlPatterns.base(baseUrl), "", 200, {
      "Content-Type": "text/html",
    }),
  ],

  error: (baseUrl = "https://example.com", status = 500): MockResponse =>
    successResponse(
      urlPatterns.base(_baseUrl),
      { error: `HTTP ${status}` },
      status
    ),

  networkError: (_baseUrl = "https://example.com"): MockResponse =>
    networkErrorResponse(urlPatterns.base(baseUrl)),
}

// ── Generic REST Mocks ──────────────────────────────────────────────────────────

export const genericRestMocks = {
  success: (
    baseUrl = "https://api.example.com",
    body = { status: "ok" }
  ): MockResponse[] => [successResponse(urlPatterns.base(baseUrl), body)],

  error: (baseUrl = "https://api.example.com", status = 500): MockResponse =>
    successResponse(
      urlPatterns.base(baseUrl),
      { error: `HTTP ${status}` },
      status
    ),
}
