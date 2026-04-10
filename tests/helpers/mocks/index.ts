/**
 * Adapter Mocks - Main Entry Point
 *
 * Provides mock data generators and request handlers for all service adapters.
 * These mocks can be used in both unit tests (Vitest) and e2e tests (Playwright).
 *
 * ## Quick Start
 *
 * ### Unit Tests (Vitest)
 *
 * ```ts
 * import { mocks, withMockAdapter } from '@/tests/helpers/mocks'
 *
 * // Setup mock responses for Radarr
 * await withMockAdapter(mocks.radarr.success(), async () => {
 *   const result = await radarrDefinition.fetchData(config)
 *   expect(result.queued).toBe(5)
 * })
 * ```
 *
 * ### E2E Tests (Playwright)
 *
 * ```ts
 * import { createPlaywrightMockAdapter, mocks } from '@/tests/helpers/mocks'
 *
 * test('dashboard loads with radarr widget', async ({ page }) => {
 *   const mockAdapter = createPlaywrightMockAdapter(page)
 *   mockAdapter.setup(...mocks.radarr.success())
 *
 *   await page.goto('/dashboard')
 *   await expect(page.getByText('Radarr')).toBeVisible()
 * })
 * ```
 *
 * ## Available Mocks
 *
 * All adapters have mocks with the following patterns:
 * - `success(baseUrl, options?)` - Successful response with customizable data
 * - `empty(baseUrl)` - Empty state (no data)
 * - `error(baseUrl, status?)` - Error response (default 500)
 * - `unauthorized(baseUrl)` - 401 Unauthorized (where applicable)
 *
 * ### Adapters with Mocks
 *
 * **Media Servers:**
 * - `plex` - Plex Media Server
 * - `jellyfin` - Jellyfin Media Server
 * - `emby` - Emby Media Server
 * - `tautulli` - Plex analytics
 *
 * **Download Managers:**
 * - `radarr` - Movie management
 * - `sonarr` - TV show management
 * - `lidarr` - Music management
 * - `readarr` - Book management
 * - `prowlarr` - Indexer management
 * - `bazarr` - Subtitle management
 * - `jackett` - Torrent proxy
 * - `sabnzbd` - Usenet downloader
 * - `qbittorrent` - BitTorrent client
 * - `transmission` - BitTorrent client
 *
 * **Networking & Security:**
 * - `adguard` - AdGuard Home DNS
 * - `pihole` - Pi-hole DNS
 * - `unifi` - UniFi Network
 * - `traefik` - Reverse proxy
 * - `nginxProxyManager` - Nginx Proxy Manager
 *
 * **Infrastructure:**
 * - `proxmox` - Proxmox VE
 * - `proxmoxBackupServer` - Proxmox Backup Server
 * - `portainer` - Docker management
 * - `grafana` - Monitoring dashboards
 * - `uptimeKuma` - Uptime monitoring
 * - `apcups` - UPS monitoring
 * - `unmanic` - Video transcoder
 *
 * **Monitoring & Weather:**
 * - `glances` - System monitoring
 * - `openmeteo` - Weather (Open-Meteo)
 * - `openweathermap` - Weather (OpenWeatherMap)
 *
 * **Other:**
 * - `seerr` - Overseerr/Seerr
 * - `immich` - Photo management
 * - `frigate` - NVR system
 * - `homeassistant` - Home automation
 * - `calibreWeb` - E-book management
 * - `matrix` - Matrix chat
 * - `genericPing` - Simple HTTP ping
 * - `genericRest` - Generic REST API
 *
 * **Client-side only (no mocks needed):**
 * - `datetime` - Date/time widget
 * - `search` - Search widget
 * - `pipes` - Pipes screensaver
 */

// Export core mock utilities
export {
  createMockAdapter,
  createPlaywrightMockAdapter,
  withMockAdapter,
  urlPatterns,
  successResponse,
  errorResponse,
  networkErrorResponse,
  mockApi,
  mockParallel,
} from "../adapter-mocks"

export type {
  MockResponse,
  MockAdapter,
  RecordedRequest,
} from "../adapter-mocks"

// Import types for internal use
import type { MockResponse, MockAdapter } from "../adapter-mocks"

// Export all adapter mocks
export {
  // *arr family
  radarrMocks,
  sonarrMocks,
  lidarrMocks,
  readarrMocks,
  prowlarrMocks,
} from "./arr-adapters"

export {
  // Download & media
  sabnzbdMocks,
  qbittorrentMocks,
  transmissionMocks,
  plexMocks,
  tautulliMocks,
  bazarrMocks,
  jackettMocks,
} from "./download-media-adapters"

export {
  // Network & monitoring
  adguardMocks,
  piholeMocks,
  glancesMocks,
  openmeteoMocks,
  openweathermapMocks,
  unifiMocks,
  apcupsMocks,
} from "./network-monitoring-adapters"

export {
  // Infrastructure
  proxmoxMocks,
  proxmoxBackupServerMocks,
  nginxProxyManagerMocks,
  portainerMocks,
  traefikMocks,
  seerrMocks,
  calibreWebMocks,
  unmanicMocks,
} from "./infrastructure-adapters"

export {
  // Specialized
  embyMocks,
  jellyfinMocks,
  immichMocks,
  frigateMocks,
  homeassistantMocks,
  grafanaMocks,
  uptimeKumaMocks,
  matrixMocks,
  datetimeMocks,
  searchMocks,
  pipesMocks,
  genericPingMocks,
  genericRestMocks,
} from "./specialized-adapters"

// ── Unified Mock Registry ───────────────────────────────────────────────────────

/**
 * Centralized access to all adapter mocks
 * Use this object to access mocks by adapter ID
 */
export const mocks = {
  // Active adapters
  radarr: (await import("./arr-adapters")).radarrMocks,
  sonarr: (await import("./arr-adapters")).sonarrMocks,
  prowlarr: (await import("./arr-adapters")).prowlarrMocks,
  seerr: (await import("./infrastructure-adapters")).seerrMocks,
  sabnzbd: (await import("./download-media-adapters")).sabnzbdMocks,
  qbittorrent: (await import("./download-media-adapters")).qbittorrentMocks,
  adguard: (await import("./network-monitoring-adapters")).adguardMocks,
  bazarr: (await import("./download-media-adapters")).bazarrMocks,
  tautulli: (await import("./download-media-adapters")).tautulliMocks,
  plex: (await import("./download-media-adapters")).plexMocks,
  unmanic: (await import("./infrastructure-adapters")).unmanicMocks,
  apcups: (await import("./network-monitoring-adapters")).apcupsMocks,
  unifi: (await import("./network-monitoring-adapters")).unifiMocks,
  "nginx-proxy-manager": (await import("./infrastructure-adapters"))
    .nginxProxyManagerMocks,
  proxmox: (await import("./infrastructure-adapters")).proxmoxMocks,
  "proxmox-backup-server": (await import("./infrastructure-adapters"))
    .proxmoxBackupServerMocks,
  "calibre-web": (await import("./infrastructure-adapters")).calibreWebMocks,

  // General widgets
  openmeteo: (await import("./network-monitoring-adapters")).openmeteoMocks,
  datetime: (await import("./specialized-adapters")).datetimeMocks,
  glances: (await import("./network-monitoring-adapters")).glancesMocks,
  "glances-timeseries": (await import("./network-monitoring-adapters"))
    .glancesMocks,
  "glances-percpu": (await import("./network-monitoring-adapters"))
    .glancesMocks,
  "glances-processes": (await import("./network-monitoring-adapters"))
    .glancesMocks,
  "glances-sensors": (await import("./network-monitoring-adapters"))
    .glancesMocks,
  "glances-diskusage": (await import("./network-monitoring-adapters"))
    .glancesMocks,
  openweathermap: (await import("./network-monitoring-adapters"))
    .openweathermapMocks,
  search: (await import("./specialized-adapters")).searchMocks,
  matrix: (await import("./specialized-adapters")).matrixMocks,
  pipes: (await import("./specialized-adapters")).pipesMocks,

  // Disabled adapters
  emby: (await import("./specialized-adapters")).embyMocks,
  jellyfin: (await import("./specialized-adapters")).jellyfinMocks,
  lidarr: (await import("./arr-adapters")).lidarrMocks,
  readarr: (await import("./arr-adapters")).readarrMocks,
  pihole: (await import("./network-monitoring-adapters")).piholeMocks,
  portainer: (await import("./infrastructure-adapters")).portainerMocks,
  traefik: (await import("./infrastructure-adapters")).traefikMocks,
  "uptime-kuma": (await import("./specialized-adapters")).uptimeKumaMocks,
  grafana: (await import("./specialized-adapters")).grafanaMocks,
  "generic-ping": (await import("./specialized-adapters")).genericPingMocks,
  "generic-rest": (await import("./specialized-adapters")).genericRestMocks,
  transmission: (await import("./download-media-adapters")).transmissionMocks,
  immich: (await import("./specialized-adapters")).immichMocks,
  jackett: (await import("./download-media-adapters")).jackettMocks,
  frigate: (await import("./specialized-adapters")).frigateMocks,
  homeassistant: (await import("./specialized-adapters")).homeassistantMocks,
} as const

// ── Helper Functions ─────────────────────────────────────────────────────────────

/**
 * Get mock responses for an adapter by ID
 *
 * @param adapterId - The adapter ID (e.g., 'radarr', 'sonarr')
 * @param state - The mock state ('success', 'empty', 'error', 'unauthorized')
 * @param baseUrl - The base URL to use for the mock
 * @param options - Additional options for the mock
 *
 * @example
 * ```ts
 * const mocks = getMocksForAdapter('radarr', 'success', 'https://radarr.test', { queued: 10 })
 * ```
 */
export function getMocksForAdapter(
  adapterId: keyof typeof mocks,
  state: "success" | "empty" | "error" | "unauthorized" = "success",
  baseUrl = "https://example.com",
  options?: Record<string, unknown>
): MockResponse[] {
  const adapterMocks = mocks[adapterId] as Record<
    string,
    (...args: unknown[]) => MockResponse[]
  >

  if (!adapterMocks) {
    throw new Error(`No mocks found for adapter: ${adapterId}`)
  }

  const mockFn = adapterMocks[state]
  if (!mockFn) {
    throw new Error(`No '${state}' mock found for adapter: ${adapterId}`)
  }

  return mockFn(baseUrl, options) as MockResponse[]
}

/**
 * Setup mocks for multiple adapters at once
 *
 * @param mockAdapter - The mock adapter instance
 * @param configs - Array of adapter mock configurations
 *
 * @example
 * ```ts
 * const mockAdapter = createMockAdapter()
 * setupMultipleMocks(mockAdapter, [
 *   { adapterId: 'radarr', state: 'success', baseUrl: 'https://radarr.test' },
 *   { adapterId: 'sonarr', state: 'success', baseUrl: 'https://sonarr.test' },
 * ])
 * ```
 */
export function setupMultipleMocks(
  mockAdapter: MockAdapter,
  configs: Array<{
    adapterId: keyof typeof mocks
    state?: "success" | "empty" | "error" | "unauthorized"
    baseUrl?: string
    options?: Record<string, unknown>
  }>
): void {
  const allResponses: MockResponse[] = []

  for (const config of configs) {
    const responses = getMocksForAdapter(
      config.adapterId,
      config.state || "success",
      config.baseUrl || "https://example.com",
      config.options
    )
    allResponses.push(...responses)
  }

  mockAdapter.setup(...allResponses)
}
