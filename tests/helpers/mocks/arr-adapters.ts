/**
 * Mock data for *arr family adapters (Radarr, Sonarr, Lidarr, Readarr, Prowlarr)
 * These adapters share similar API patterns and data structures.
 */

import type { MockResponse } from "../adapter-mocks"
import { successResponse, urlPatterns } from "../adapter-mocks"

// Helper to create URL pattern scoped to a base URL
const api = (baseUrl: string, path: string) => urlPatterns.api(baseUrl, path)

// ── Radarr Mocks ────────────────────────────────────────────────────────────────

export const radarrMocks = {
  success: (
    baseUrl = "https://radarr.example.com",
    opts?: {
      queued?: number
      missing?: number
      wanted?: number
      movies?: number
      downloads?: Array<{
        title: string
        size: number
        sizeleft: number
        estimatedCompletionTime?: string
        trackedDownloadState?: string
      }>
    }
  ): MockResponse[] => {
    const downloads = opts?.downloads || []
    return [
      successResponse(api(baseUrl, "/api/v3/queue"), {
        totalRecords: opts?.queued ?? 5,
        records: downloads.map((d) => ({
          title: d.title,
          size: d.size,
          sizeleft: d.sizeleft,
          estimatedCompletionTime: d.estimatedCompletionTime,
          trackedDownloadState: d.trackedDownloadState || "downloading",
        })),
      }),
      successResponse(
        api(baseUrl, "/api/v3/movie"),
        Array.from({ length: opts?.movies ?? 10 }, (_, i) => ({
          id: i + 1,
          title: `Movie ${i + 1}`,
        }))
      ),
      successResponse(api(baseUrl, "/api/v3/wanted/missing"), {
        totalRecords: opts?.missing ?? 3,
      }),
      successResponse(api(baseUrl, "/api/v3/wanted/cutoff"), {
        totalRecords: opts?.wanted ?? 7,
      }),
    ]
  },

  empty: (baseUrl = "https://radarr.example.com"): MockResponse[] => [
    successResponse(api(baseUrl, "/api/v3/queue"), {
      totalRecords: 0,
      records: [],
    }),
    successResponse(api(baseUrl, "/api/v3/movie"), []),
    successResponse(api(baseUrl, "/api/v3/wanted/missing"), {
      totalRecords: 0,
    }),
    successResponse(api(baseUrl, "/api/v3/wanted/cutoff"), { totalRecords: 0 }),
  ],

  error: (
    baseUrl = "https://radarr.example.com",
    status = 500
  ): MockResponse[] => [
    successResponse(
      api(baseUrl, "/api/v3/queue"),
      { error: `Radarr error: ${status}` },
      status
    ),
    successResponse(
      api(baseUrl, "/api/v3/movie"),
      { error: `Radarr error: ${status}` },
      status
    ),
    successResponse(
      api(baseUrl, "/api/v3/wanted/missing"),
      { error: `Radarr error: ${status}` },
      status
    ),
    successResponse(
      api(baseUrl, "/api/v3/wanted/cutoff"),
      { error: `Radarr error: ${status}` },
      status
    ),
  ],

  unauthorized: (baseUrl = "https://radarr.example.com"): MockResponse[] => [
    successResponse(
      api(baseUrl, "/api/v3/queue"),
      { error: "Unauthorized" },
      401
    ),
    successResponse(
      api(baseUrl, "/api/v3/movie"),
      { error: "Unauthorized" },
      401
    ),
    successResponse(
      api(baseUrl, "/api/v3/wanted/missing"),
      { error: "Unauthorized" },
      401
    ),
    successResponse(
      api(baseUrl, "/api/v3/wanted/cutoff"),
      { error: "Unauthorized" },
      401
    ),
  ],
}

// ── Sonarr Mocks ────────────────────────────────────────────────────────────────

export const sonarrMocks = {
  success: (
    baseUrl = "https://sonarr.example.com",
    opts?: {
      queued?: number
      missing?: number
      wanted?: number
      series?: number
      downloads?: Array<{
        title: string
        seriesTitle?: string
        episodeTitle?: string
        size: number
        sizeleft: number
        estimatedCompletionTime?: string
        trackedDownloadState?: string
      }>
    }
  ): MockResponse[] => {
    const downloads = opts?.downloads || []
    return [
      successResponse(api(baseUrl, "/api/v3/queue"), {
        totalRecords: opts?.queued ?? 3,
        records: downloads.map((d) => ({
          title: d.title,
          series: d.seriesTitle ? { title: d.seriesTitle } : undefined,
          episode: d.episodeTitle ? { title: d.episodeTitle } : undefined,
          size: d.size,
          sizeleft: d.sizeleft,
          estimatedCompletionTime: d.estimatedCompletionTime,
          trackedDownloadState: d.trackedDownloadState || "downloading",
        })),
      }),
      successResponse(
        api(baseUrl, "/api/v3/series"),
        Array.from({ length: opts?.series ?? 15 }, (_, i) => ({
          id: i + 1,
          title: `Series ${i + 1}`,
        }))
      ),
      successResponse(api(baseUrl, "/api/v3/wanted/missing"), {
        totalRecords: opts?.missing ?? 5,
      }),
      successResponse(api(baseUrl, "/api/v3/wanted/cutoff"), {
        totalRecords: opts?.wanted ?? 2,
      }),
    ]
  },

  empty: (baseUrl = "https://sonarr.example.com"): MockResponse[] => [
    successResponse(api(baseUrl, "/api/v3/queue"), {
      totalRecords: 0,
      records: [],
    }),
    successResponse(api(baseUrl, "/api/v3/series"), []),
    successResponse(api(baseUrl, "/api/v3/wanted/missing"), {
      totalRecords: 0,
    }),
    successResponse(api(baseUrl, "/api/v3/wanted/cutoff"), { totalRecords: 0 }),
  ],

  error: (
    baseUrl = "https://sonarr.example.com",
    status = 500
  ): MockResponse[] => [
    successResponse(
      api(baseUrl, "/api/v3/queue"),
      { error: `Sonarr error: ${status}` },
      status
    ),
    successResponse(
      api(baseUrl, "/api/v3/series"),
      { error: `Sonarr error: ${status}` },
      status
    ),
    successResponse(
      api(baseUrl, "/api/v3/wanted/missing"),
      { error: `Sonarr error: ${status}` },
      status
    ),
    successResponse(
      api(baseUrl, "/api/v3/wanted/cutoff"),
      { error: `Sonarr error: ${status}` },
      status
    ),
  ],

  unauthorized: (baseUrl = "https://sonarr.example.com"): MockResponse[] => [
    successResponse(
      api(baseUrl, "/api/v3/queue"),
      { error: "Unauthorized" },
      401
    ),
    successResponse(
      api(baseUrl, "/api/v3/series"),
      { error: "Unauthorized" },
      401
    ),
    successResponse(
      api(baseUrl, "/api/v3/wanted/missing"),
      { error: "Unauthorized" },
      401
    ),
    successResponse(
      api(baseUrl, "/api/v3/wanted/cutoff"),
      { error: "Unauthorized" },
      401
    ),
  ],
}

// ── Lidarr Mocks ────────────────────────────────────────────────────────────────

export const lidarrMocks = {
  success: (
    baseUrl = "https://lidarr.example.com",
    opts?: {
      queued?: number
      missing?: number
      wanted?: number
      artists?: number
    }
  ): MockResponse[] => [
    successResponse(api(baseUrl, "/api/v1/queue"), {
      totalRecords: opts?.queued ?? 2,
      records: [],
    }),
    successResponse(
      api(baseUrl, "/api/v1/artist"),
      Array.from({ length: opts?.artists ?? 20 }, (_, i) => ({
        id: i + 1,
        name: `Artist ${i + 1}`,
      }))
    ),
    successResponse(api(baseUrl, "/api/v1/wanted/missing"), {
      totalRecords: opts?.missing ?? 8,
    }),
    successResponse(api(baseUrl, "/api/v1/wanted/cutoff"), {
      totalRecords: opts?.wanted ?? 4,
    }),
  ],

  empty: (baseUrl = "https://lidarr.example.com"): MockResponse[] => [
    successResponse(api(baseUrl, "/api/v1/queue"), {
      totalRecords: 0,
      records: [],
    }),
    successResponse(api(baseUrl, "/api/v1/artist"), []),
    successResponse(api(baseUrl, "/api/v1/wanted/missing"), {
      totalRecords: 0,
    }),
    successResponse(api(baseUrl, "/api/v1/wanted/cutoff"), { totalRecords: 0 }),
  ],

  error: (
    baseUrl = "https://lidarr.example.com",
    status = 500
  ): MockResponse[] => [
    successResponse(
      api(baseUrl, "/api/v1/queue"),
      { error: `Lidarr error: ${status}` },
      status
    ),
    successResponse(
      api(baseUrl, "/api/v1/artist"),
      { error: `Lidarr error: ${status}` },
      status
    ),
    successResponse(
      api(baseUrl, "/api/v1/wanted/missing"),
      { error: `Lidarr error: ${status}` },
      status
    ),
    successResponse(
      api(baseUrl, "/api/v1/wanted/cutoff"),
      { error: `Lidarr error: ${status}` },
      status
    ),
  ],
}

// ── Readarr Mocks ───────────────────────────────────────────────────────────────

export const readarrMocks = {
  success: (
    baseUrl = "https://readarr.example.com",
    opts?: {
      queued?: number
      missing?: number
      wanted?: number
      books?: number
      authors?: number
    }
  ): MockResponse[] => [
    successResponse(api(baseUrl, "/api/v1/queue"), {
      totalRecords: opts?.queued ?? 1,
      records: [],
    }),
    successResponse(
      api(baseUrl, "/api/v1/book"),
      Array.from({ length: opts?.books ?? 50 }, (_, i) => ({
        id: i + 1,
        title: `Book ${i + 1}`,
      }))
    ),
    successResponse(
      api(baseUrl, "/api/v1/author"),
      Array.from({ length: opts?.authors ?? 10 }, (_, i) => ({
        id: i + 1,
        name: `Author ${i + 1}`,
      }))
    ),
    successResponse(api(baseUrl, "/api/v1/wanted/missing"), {
      totalRecords: opts?.missing ?? 12,
    }),
    successResponse(api(baseUrl, "/api/v1/wanted/cutoff"), {
      totalRecords: opts?.wanted ?? 6,
    }),
  ],

  empty: (baseUrl = "https://readarr.example.com"): MockResponse[] => [
    successResponse(api(baseUrl, "/api/v1/queue"), {
      totalRecords: 0,
      records: [],
    }),
    successResponse(api(baseUrl, "/api/v1/book"), []),
    successResponse(api(baseUrl, "/api/v1/author"), []),
    successResponse(api(baseUrl, "/api/v1/wanted/missing"), {
      totalRecords: 0,
    }),
    successResponse(api(baseUrl, "/api/v1/wanted/cutoff"), { totalRecords: 0 }),
  ],

  error: (
    baseUrl = "https://readarr.example.com",
    status = 500
  ): MockResponse[] => [
    successResponse(
      api(baseUrl, "/api/v1/queue"),
      { error: `Readarr error: ${status}` },
      status
    ),
    successResponse(
      api(baseUrl, "/api/v1/book"),
      { error: `Readarr error: ${status}` },
      status
    ),
    successResponse(
      api(baseUrl, "/api/v1/author"),
      { error: `Readarr error: ${status}` },
      status
    ),
    successResponse(
      api(baseUrl, "/api/v1/wanted/missing"),
      { error: `Readarr error: ${status}` },
      status
    ),
    successResponse(
      api(baseUrl, "/api/v1/wanted/cutoff"),
      { error: `Readarr error: ${status}` },
      status
    ),
  ],
}

// ── Prowlarr Mocks ──────────────────────────────────────────────────────────────

export const prowlarrMocks = {
  success: (
    baseUrl = "https://prowlarr.example.com",
    opts?: {
      indexers?: number
      grabs?: number
      queries?: number
      failedQueries?: number
    }
  ): MockResponse[] => [
    successResponse(
      api(baseUrl, "/api/v1/indexer"),
      Array.from({ length: opts?.indexers ?? 8 }, (_, i) => ({
        id: i + 1,
        name: `Indexer ${i + 1}`,
      }))
    ),
    successResponse(
      api(baseUrl, "/api/v1/indexerstatus"),
      Array.from({ length: opts?.indexers ?? 8 }, (_, i) => ({
        indexerId: i + 1,
        indexerName: `Indexer ${i + 1}`,
        disabledTill: null,
        disabledReason: null,
      }))
    ),
    successResponse(api(baseUrl, "/api/v1/statistics"), {
      grabs: opts?.grabs ?? 1234,
      successfulQueries: (opts?.queries ?? 500) - (opts?.failedQueries ?? 20),
      failedQueries: opts?.failedQueries ?? 20,
    }),
  ],

  empty: (baseUrl = "https://prowlarr.example.com"): MockResponse[] => [
    successResponse(api(baseUrl, "/api/v1/indexer"), []),
    successResponse(api(baseUrl, "/api/v1/indexerstatus"), []),
    successResponse(api(baseUrl, "/api/v1/statistics"), {
      grabs: 0,
      successfulQueries: 0,
      failedQueries: 0,
    }),
  ],

  error: (
    baseUrl = "https://prowlarr.example.com",
    status = 500
  ): MockResponse[] => [
    successResponse(
      api(baseUrl, "/api/v1/indexer"),
      { error: `Prowlarr error: ${status}` },
      status
    ),
    successResponse(
      api(baseUrl, "/api/v1/indexerstatus"),
      { error: `Prowlarr error: ${status}` },
      status
    ),
    successResponse(
      api(baseUrl, "/api/v1/statistics"),
      { error: `Prowlarr error: ${status}` },
      status
    ),
  ],
}
