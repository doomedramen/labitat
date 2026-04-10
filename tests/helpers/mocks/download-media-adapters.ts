/**
 * Mock data for download and media adapters (SABnzbd, qBittorrent, Transmission, Plex, Tautulli, Bazarr, Jackett)
 */

import type { MockResponse } from "../adapter-mocks"
import { successResponse, urlPatterns } from "../adapter-mocks"

// ── SABnzbd Mocks ───────────────────────────────────────────────────────────────

export const sabnzbdMocks = {
  success: (
    baseUrl = "https://sabnzbd.example.com",
    opts?: {
      speed?: string
      timeleft?: string
      queueSize?: number
      downloading?: boolean
      slots?: Array<{
        filename: string
        percentage: number
        timeleft: string
        mb: string
      }>
    }
  ): MockResponse[] => {
    const slots = opts?.slots || [
      {
        filename: "Ubuntu.24.04.iso",
        percentage: 45.5,
        timeleft: "00:15:30",
        mb: "4096",
      },
      {
        filename: "Node.js.Docs.pdf",
        percentage: 100,
        timeleft: "00:00:00",
        mb: "25",
      },
    ]

    return [
      successResponse(urlPatterns.contains("/api"), {
        queue: {
          status: opts?.downloading !== false ? "Downloading" : "Idle",
          speed: opts?.speed || "25.5 MB/s",
          timeleft: opts?.timeleft || "00:15:30",
          noofslots: opts?.queueSize ?? slots.length,
          slots: slots.map((s) => ({
            filename: s.filename,
            percentage: String(s.percentage),
            timeleft: s.timeleft,
            mb: s.mb,
            mbleft: String(parseFloat(s.mb) * (1 - s.percentage / 100)),
          })),
        },
      }),
    ]
  },

  empty: (baseUrl = "https://sabnzbd.example.com"): MockResponse[] => [
    successResponse(urlPatterns.contains("/api"), {
      queue: {
        status: "Idle",
        speed: "0 B/s",
        timeleft: "—",
        noofslots: 0,
        slots: [],
      },
    }),
  ],

  error: (
    baseUrl = "https://sabnzbd.example.com",
    status = 500
  ): MockResponse =>
    successResponse(
      urlPatterns.contains("/api"),
      { error: `SABnzbd error: ${status}` },
      status
    ),
}

// ── qBittorrent Mocks ───────────────────────────────────────────────────────────

export const qbittorrentMocks = {
  success: (
    baseUrl = "https://qbittorrent.example.com",
    opts?: {
      downloads?: Array<{
        name: string
        progress: number
        dlspeed: number
        eta: number
        state: string
        size: number
      }>
      globalDlSpeed?: number
      globalUpSpeed?: number
    }
  ): MockResponse[] => {
    const downloads = opts?.downloads || [
      {
        name: "ubuntu-24.04-desktop-amd64.iso",
        progress: 0.45,
        dlspeed: 5242880,
        eta: 900,
        state: "downloading",
        size: 4294967296,
      },
    ]

    return [
      // Login
      successResponse(urlPatterns.contains("/api/v2/auth/login"), "Ok."),
      // Torrent list
      successResponse(
        urlPatterns.contains("/api/v2/torrents/info"),
        downloads.map((d) => ({
          name: d.name,
          progress: d.progress,
          dlspeed: d.dlspeed,
          eta: d.eta,
          state: d.state,
          size: d.size,
        }))
      ),
      // Global transfer info
      successResponse(urlPatterns.contains("/api/v2/transfer/info"), {
        dl_info_speed: opts?.globalDlSpeed ?? 5242880,
        up_info_speed: 1048576,
      }),
    ]
  },

  empty: (baseUrl = "https://qbittorrent.example.com"): MockResponse[] => [
    successResponse(urlPatterns.contains("/api/v2/auth/login"), "Ok."),
    successResponse(urlPatterns.contains("/api/v2/torrents/info"), []),
    successResponse(urlPatterns.contains("/api/v2/transfer/info"), {
      dl_info_speed: 0,
      up_info_speed: 0,
    }),
  ],

  error: (
    baseUrl = "https://qbittorrent.example.com",
    status = 403
  ): MockResponse =>
    successResponse(
      urlPatterns.contains("/api/v2/auth/login"),
      "Fails.",
      status
    ),
}

// ── Transmission Mocks ──────────────────────────────────────────────────────────

export const transmissionMocks = {
  success: (
    baseUrl = "https://transmission.example.com",
    opts?: {
      downloads?: Array<{
        name: string
        percentDone: number
        rateDownload: number
        eta: number
        status: number
        sizeWhenDone: number
      }>
    }
  ): MockResponse[] => {
    const downloads = opts?.downloads || [
      {
        name: "debian-12.iso",
        percentDone: 0.65,
        rateDownload: 3145728,
        eta: 600,
        status: 4, // downloading
        sizeWhenDone: 3758096384,
      },
    ]

    return [
      // Session ID request (returns 409 with session ID in header)
      successResponse(
        urlPatterns.contains("/transmission/rpc"),
        "<html><p>409: Conflict</p></html>",
        409,
        { "X-Transmission-Session-Id": "test-session-id-12345" }
      ),
      // Actual API call
      successResponse(
        urlPatterns.contains("/transmission/rpc"),
        {
          result: "success",
          arguments: {
            torrents: downloads.map((d) => ({
              name: d.name,
              percentDone: d.percentDone,
              rateDownload: d.rateDownload,
              eta: d.eta,
              status: d.status,
              sizeWhenDone: d.sizeWhenDone,
            })),
          },
        },
        200,
        { "Content-Type": "application/json" }
      ),
    ]
  },

  empty: (baseUrl = "https://transmission.example.com"): MockResponse[] => [
    successResponse(
      urlPatterns.contains("/transmission/rpc"),
      "<html><p>409: Conflict</p></html>",
      409,
      { "X-Transmission-Session-Id": "test-session-id-12345" }
    ),
    successResponse(
      urlPatterns.contains("/transmission/rpc"),
      { result: "success", arguments: { torrents: [] } },
      200,
      { "Content-Type": "application/json" }
    ),
  ],

  error: (
    baseUrl = "https://transmission.example.com",
    status = 401
  ): MockResponse =>
    successResponse(
      urlPatterns.contains("/transmission/rpc"),
      { error: "Unauthorized" },
      status
    ),
}

// ── Plex Mocks ──────────────────────────────────────────────────────────────────

export const plexMocks = {
  success: (
    baseUrl = "https://plex.example.com",
    opts?: {
      streams?: number
      albums?: number
      movies?: number
      tvShows?: number
      sessions?: Array<{
        title: string
        grandparentTitle?: string
        type: string
        viewOffset: number
        duration: number
        user: string
        state: string
      }>
    }
  ): MockResponse[] => {
    const sessions = opts?.sessions || []
    const sessionsXml =
      sessions.length > 0
        ? `<?xml version="1.0" encoding="UTF-8"?>
<MediaContainer size="${opts?.streams ?? sessions.length}">
  ${sessions
    .map(
      (s) => `
  <Video 
    title="${s.title}" 
    type="${s.type}" 
    viewOffset="${s.viewOffset}" 
    duration="${s.duration}"
    ${s.grandparentTitle ? `grandparentTitle="${s.grandparentTitle}"` : ""}
  >
    <User title="${s.user}" />
    <Player state="${s.state}" />
  </Video>
  `
    )
    .join("\n")}
</MediaContainer>`
        : `<?xml version="1.0" encoding="UTF-8"?>
<MediaContainer size="${opts?.streams ?? 0}"></MediaContainer>`

    return [
      successResponse(
        urlPatterns.contains("/status/sessions"),
        sessionsXml,
        200,
        { "Content-Type": "text/xml" }
      ),
      successResponse(
        urlPatterns.contains("/library/sections"),
        `<?xml version="1.0" encoding="UTF-8"?>
<MediaContainer>
  <Directory key="1" type="movie" title="Movies" />
  <Directory key="2" type="show" title="TV Shows" />
  <Directory key="3" type="artist" title="Music" />
</MediaContainer>`,
        200,
        { "Content-Type": "text/xml" }
      ),
      successResponse(
        urlPatterns.contains("/library/sections/1/all"),
        `<MediaContainer totalSize="${opts?.movies ?? 50}"></MediaContainer>`,
        200,
        { "Content-Type": "text/xml" }
      ),
      successResponse(
        urlPatterns.contains("/library/sections/2/all"),
        `<MediaContainer totalSize="${opts?.tvShows ?? 20}"></MediaContainer>`,
        200,
        { "Content-Type": "text/xml" }
      ),
      successResponse(
        urlPatterns.contains("/library/sections/3/albums"),
        `<MediaContainer totalSize="${opts?.albums ?? 30}"></MediaContainer>`,
        200,
        { "Content-Type": "text/xml" }
      ),
    ]
  },

  empty: (baseUrl = "https://plex.example.com"): MockResponse[] => [
    successResponse(
      urlPatterns.contains("/status/sessions"),
      '<MediaContainer size="0"></MediaContainer>',
      200,
      { "Content-Type": "text/xml" }
    ),
    successResponse(
      urlPatterns.contains("/library/sections"),
      "<MediaContainer></MediaContainer>",
      200,
      { "Content-Type": "text/xml" }
    ),
  ],

  unauthorized: (baseUrl = "https://plex.example.com"): MockResponse =>
    successResponse(
      urlPatterns.contains("/status/sessions"),
      { error: "Unauthorized" },
      401
    ),
}

// ── Tautulli Mocks ──────────────────────────────────────────────────────────────

export const tautulliMocks = {
  success: (
    baseUrl = "https://tautulli.example.com",
    opts?: {
      streamCount?: number
      streams?: Array<{
        title: string
        grandparentTitle?: string
        media_type: string
        progress_percent: number
        user: string
        state: string
      }>
      totalPlays?: number
      playsThisMonth?: number
    }
  ): MockResponse[] => {
    const streams = opts?.streams || []

    return [
      successResponse(
        urlPatterns.withQuery(baseUrl, "/api/v2", { cmd: "get_activity" }),
        {
          response: {
            result: "success",
            data: {
              stream_count: opts?.streamCount ?? streams.length,
              sessions: streams.map((s) => ({
                title: s.title,
                grandparent_title: s.grandparentTitle,
                media_type: s.media_type,
                progress_percent: s.progress_percent,
                user: s.user,
                state: s.state,
              })),
            },
          },
        }
      ),
      successResponse(
        urlPatterns.withQuery(baseUrl, "/api/v2", { cmd: "get_history" }),
        {
          response: {
            result: "success",
            data: {
              recordsFiltered: opts?.totalPlays ?? 1234,
              draw: 1,
            },
          },
        }
      ),
      successResponse(
        urlPatterns.withQuery(baseUrl, "/api/v2", { cmd: "get_monthly_plays" }),
        {
          response: {
            result: "success",
            data: {
              plays: opts?.playsThisMonth ?? 156,
            },
          },
        }
      ),
    ]
  },

  empty: (baseUrl = "https://tautulli.example.com"): MockResponse[] => [
    successResponse(
      urlPatterns.withQuery(baseUrl, "/api/v2", { cmd: "get_activity" }),
      {
        response: {
          result: "success",
          data: { stream_count: 0, sessions: [] },
        },
      }
    ),
    successResponse(
      urlPatterns.withQuery(baseUrl, "/api/v2", { cmd: "get_history" }),
      { response: { result: "success", data: { recordsFiltered: 0, draw: 1 } } }
    ),
    successResponse(
      urlPatterns.withQuery(baseUrl, "/api/v2", { cmd: "get_monthly_plays" }),
      { response: { result: "success", data: { plays: 0 } } }
    ),
  ],

  error: (
    baseUrl = "https://tautulli.example.com",
    status = 500
  ): MockResponse =>
    successResponse(
      urlPatterns.withQuery(baseUrl, "/api/v2", { cmd: "get_activity" }),
      { error: `Tautulli error: ${status}` },
      status
    ),
}

// ── Bazarr Mocks ────────────────────────────────────────────────────────────────

export const bazarrMocks = {
  success: (
    baseUrl = "https://bazarr.example.com",
    opts?: {
      wanted?: number
      missing?: number
      series?: number
      movies?: number
    }
  ): MockResponse[] => [
    successResponse(
      urlPatterns.withQuery(baseUrl, "/api/episodes", {
        start: "0",
        length: "1",
      }),
      {
        data: [],
        recordsTotal: 0,
        recordsFiltered: opts?.wanted ?? 25,
        draw: 1,
      }
    ),
    successResponse(
      urlPatterns.withQuery(baseUrl, "/api/movies", {
        start: "0",
        length: "1",
      }),
      {
        data: [],
        recordsTotal: 0,
        recordsFiltered: opts?.missing ?? 10,
        draw: 1,
      }
    ),
    successResponse(
      urlPatterns.withQuery(baseUrl, "/api/series", {
        start: "0",
        length: "1",
      }),
      {
        data: [],
        recordsTotal: 0,
        recordsFiltered: opts?.series ?? 15,
        draw: 1,
      }
    ),
    successResponse(
      urlPatterns.withQuery(baseUrl, "/api/movies?start=0&length=1", {}),
      {
        data: [],
        recordsTotal: 0,
        recordsFiltered: opts?.movies ?? 8,
        draw: 1,
      }
    ),
  ],

  empty: (baseUrl = "https://bazarr.example.com"): MockResponse[] => [
    successResponse(urlPatterns.contains("/api/episodes"), {
      data: [],
      recordsTotal: 0,
      recordsFiltered: 0,
      draw: 1,
    }),
    successResponse(urlPatterns.contains("/api/movies"), {
      data: [],
      recordsTotal: 0,
      recordsFiltered: 0,
      draw: 1,
    }),
    successResponse(urlPatterns.contains("/api/series"), {
      data: [],
      recordsTotal: 0,
      recordsFiltered: 0,
      draw: 1,
    }),
  ],

  error: (baseUrl = "https://bazarr.example.com", status = 500): MockResponse =>
    successResponse(
      urlPatterns.contains("/api/episodes"),
      { error: `Bazarr error: ${status}` },
      status
    ),
}

// ── Jackett Mocks ───────────────────────────────────────────────────────────────

export const jackettMocks = {
  success: (
    baseUrl = "https://jackett.example.com",
    opts?: {
      indexers?: number
      configuredIndexers?: number
    }
  ): MockResponse[] => [
    successResponse(
      urlPatterns.withQuery(baseUrl, "/api/v2.0/indexers", {
        configured: "true",
      }),
      Array.from({ length: opts?.configuredIndexers ?? 5 }, (_, i) => ({
        id: `indexer-${i}`,
        name: `Indexer ${i}`,
        configured: true,
        status: "OK",
      }))
    ),
    successResponse(
      urlPatterns.contains("/api/v2.0/indexers"),
      Array.from({ length: opts?.indexers ?? 8 }, (_, i) => ({
        id: `indexer-${i}`,
        name: `Indexer ${i}`,
        configured: i < (opts?.configuredIndexers ?? 5),
        status: i < (opts?.configuredIndexers ?? 5) ? "OK" : "Error",
      }))
    ),
  ],

  empty: (baseUrl = "https://jackett.example.com"): MockResponse[] => [
    successResponse(urlPatterns.contains("/api/v2.0/indexers"), []),
  ],

  error: (
    baseUrl = "https://jackett.example.com",
    status = 500
  ): MockResponse =>
    successResponse(
      urlPatterns.contains("/api/v2.0/indexers"),
      { error: `Jackett error: ${status}` },
      status
    ),
}
