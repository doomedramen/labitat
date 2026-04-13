# Adapter Mock Utilities

Comprehensive mock data generators and request handlers for all service adapters. These mocks can be used in both **unit tests (Vitest)** and **e2e tests (Playwright)**.

## Table of Contents

- [Quick Start](#quick-start)
  - [Unit Tests (Vitest)](#unit-tests-vitest)
  - [E2E Tests (Playwright)](#e2e-tests-playwright)
- [Core API](#core-api)
  - [Mock Response Types](#mock-response-types)
  - [URL Pattern Matchers](#url-pattern-matchers)
  - [Response Builders](#response-builders)
  - [Vitest Mock Adapter](#vitest-mock-adapter)
  - [Playwright Mock Adapter](#playwright-mock-adapter)
- [Available Mocks](#available-mocks)
  - [Media Servers](#media-servers)
  - [Download Managers](#download-managers)
  - [Networking & Security](#networking--security)
  - [Infrastructure](#infrastructure)
  - [Monitoring & Weather](#monitoring--weather)
  - [Other Services](#other-services)
- [Advanced Usage](#advanced-usage)
  - [Custom Mock Data](#custom-mock-data)
  - [Multiple Adapters](#multiple-adapters)
  - [Error Scenarios](#error-scenarios)
  - [Recording Requests](#recording-requests)

---

## Quick Start

### Unit Tests (Vitest)

#### Basic Usage

```typescript
import { describe, it, expect } from "vitest";
import { radarrDefinition } from "@/lib/adapters/radarr";
import { mocks, withMockAdapter } from "@/tests/helpers/mocks";

describe("radarr adapter", () => {
  it("fetches data successfully", async () => {
    await withMockAdapter(mocks.radarr.success(), async () => {
      const result = await radarrDefinition.fetchData!({
        url: "https://radarr.example.com",
        apiKey: "test-api-key",
      });

      expect(result._status).toBe("ok");
      expect(result.queued).toBe(5);
      expect(result.movies).toBe(10);
    });
  });

  it("handles empty state", async () => {
    await withMockAdapter(mocks.radarr.empty(), async () => {
      const result = await radarrDefinition.fetchData!({
        url: "https://radarr.example.com",
        apiKey: "test-api-key",
      });

      expect(result.queued).toBe(0);
      expect(result.movies).toBe(0);
    });
  });

  it("handles error responses", async () => {
    await withMockAdapter(mocks.radarr.error("https://radarr.example.com", 500), async () => {
      await expect(
        radarrDefinition.fetchData!({
          url: "https://radarr.example.com",
          apiKey: "bad-key",
        }),
      ).rejects.toThrow("Radarr error: 500");
    });
  });
});
```

#### Using Mock Adapter Instance

```typescript
import { createMockAdapter, mocks } from "@/tests/helpers/mocks";

describe("radarr with manual mock", () => {
  let mockAdapter: ReturnType<typeof createMockAdapter>;

  beforeEach(() => {
    mockAdapter = createMockAdapter();
  });

  afterEach(() => {
    mockAdapter.teardown();
  });

  it("fetches active downloads", async () => {
    mockAdapter.setup(
      ...mocks.radarr.success("https://radarr.example.com", {
        queued: 3,
        downloads: [
          {
            title: "The Matrix (1999)",
            size: 2147483648,
            sizeleft: 1073741824,
            estimatedCompletionTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
            trackedDownloadState: "downloading",
          },
        ],
      }),
    );

    const result = await radarrDefinition.fetchData!({
      url: "https://radarr.example.com",
      apiKey: "test-key",
      showActiveDownloads: "true",
    });

    expect(result.downloads).toHaveLength(1);
    expect(result.downloads![0].progress).toBe(50);
  });
});
```

### E2E Tests (Playwright)

```typescript
import { test, expect } from "@playwright/test";
import { createPlaywrightMockAdapter, mocks } from "@/tests/helpers/mocks";

test("dashboard loads with radarr widget", async ({ page }) => {
  const mockAdapter = createPlaywrightMockAdapter(page);
  mockAdapter.setup(...mocks.radarr.success("https://radarr.test"));

  // Navigate to dashboard - radarr widget will use mocked API
  await page.goto("/dashboard");

  // Verify widget appears with mocked data
  await expect(page.getByText("Queued")).toBeVisible();
  await expect(page.getByText("5")).toBeVisible();
});

test("shows error state when API fails", async ({ page }) => {
  const mockAdapter = createPlaywrightMockAdapter(page);
  mockAdapter.setup(...mocks.radarr.error("https://radarr.test", 500));

  await page.goto("/dashboard");

  // Verify error state is shown
  await expect(page.getByText(/error/i)).toBeVisible();
});
```

---

## Core API

### Mock Response Types

```typescript
type MockResponse = {
  /** URL pattern to match (string or regex) */
  urlPattern: string | RegExp;
  /** HTTP status code */
  status?: number;
  /** Response body (will be JSON stringified if object) */
  body: unknown;
  /** Response headers */
  headers?: Record<string, string>;
  /** Simulate network error instead of returning a response */
  networkError?: boolean;
};
```

### URL Pattern Matchers

```typescript
import { urlPatterns } from "@/tests/helpers/mocks";

// Match base URL with optional trailing slash
urlPatterns.base("https://radarr.example.com");
// => /^https:\/\/radarr\.example\.com\/?/

// Match API endpoint with path segments
urlPatterns.api("https://radarr.example.com", "/api/v3/queue");
// => /^https:\/\/radarr\.example\.com\/api\/v3\/queue/

// Match with query parameters (partial match)
urlPatterns.withQuery("https://api.example.com", "/data", { key: "value" });
// => /https:\/\/api\.example\.com\/data.*key=value/

// Match any URL containing a substring
urlPatterns.contains("/api/v3/");
// => /\/api\/v3\//

// Match exact URL
urlPatterns.exact("https://example.com/api");
// => /^https:\/\/example\.com\/api$/
```

### Response Builders

```typescript
import { successResponse, errorResponse, networkErrorResponse } from "@/tests/helpers/mocks";

// Successful JSON response
successResponse(urlPatterns.contains("/api/v3/queue"), { totalRecords: 5, records: [] }, 200, {
  "Content-Type": "application/json",
});

// Error response
errorResponse(urlPatterns.contains("/api/v3/queue"), 500, {
  error: "Internal server error",
});

// Network error (simulates fetch rejection)
networkErrorResponse(urlPatterns.contains("/api/v3/queue"));
```

### Vitest Mock Adapter

```typescript
import { createMockAdapter, withMockAdapter } from "@/tests/helpers/mocks";

// Manual setup/teardown
const mockAdapter = createMockAdapter();
mockAdapter.setup(...responses);
// ... run tests
mockAdapter.teardown();

// Automatic setup/teardown with wrapper
await withMockAdapter(responses, async () => {
  // ... run tests
});
```

### Playwright Mock Adapter

```typescript
import { createPlaywrightMockAdapter } from "@/tests/helpers/mocks";

test("example test", async ({ page }) => {
  const mockAdapter = createPlaywrightMockAdapter(page);
  mockAdapter.setup(...responses);

  // ... run test

  mockAdapter.teardown(); // Optional: auto-cleaned on test end
});
```

---

## Available Mocks

All adapters provide these standard mock patterns:

- `success(baseUrl, options?)` - Successful response with customizable data
- `empty(baseUrl)` - Empty state (no data)
- `error(baseUrl, status?)` - Error response (default 500)
- `unauthorized(baseUrl)` - 401 Unauthorized (where applicable)

### Media Servers

#### Plex

```typescript
mocks.plex.success("https://plex.example.com", {
  streams: 3,
  albums: 50,
  movies: 200,
  tvShows: 30,
  sessions: [
    {
      title: "The Matrix",
      type: "movie",
      viewOffset: 1800000,
      duration: 7200000,
      user: "Martin",
      state: "playing",
    },
    {
      title: "Episode 5",
      grandparentTitle: "Breaking Bad",
      type: "episode",
      viewOffset: 600000,
      duration: 2700000,
      user: "Sarah",
      state: "playing",
    },
  ],
});
```

#### Jellyfin / Emby

```typescript
mocks.jellyfin.success("https://jellyfin.example.com", {
  streams: 2,
  movies: 150,
  tvShows: 30,
  albums: 75,
  sessions: [
    {
      name: "Inception",
      type: "Movie",
      playState: {
        positionTicks: 36000000000,
        durationTicks: 86400000000,
        isPaused: false,
      },
      userName: "Martin",
    },
  ],
});
```

#### Tautulli

```typescript
mocks.tautulli.success("https://tautulli.example.com", {
  streamCount: 5,
  totalPlays: 1234,
  playsThisMonth: 156,
  streams: [
    {
      title: "The Matrix",
      media_type: "movie",
      progress_percent: 25,
      user: "Martin",
      state: "playing",
    },
  ],
});
```

### Download Managers

#### Radarr

```typescript
mocks.radarr.success("https://radarr.example.com", {
  queued: 5,
  missing: 3,
  wanted: 7,
  movies: 50,
  downloads: [
    {
      title: "The Matrix (1999)",
      size: 2147483648,
      sizeleft: 1073741824,
      estimatedCompletionTime: new Date(Date.now() + 45 * 60 * 1000).toISOString(),
      trackedDownloadState: "downloading",
    },
  ],
});
```

#### Sonarr

```typescript
mocks.sonarr.success("https://sonarr.example.com", {
  queued: 3,
  missing: 5,
  wanted: 2,
  series: 15,
  downloads: [
    {
      title: "S01E05 - The One",
      seriesTitle: "Breaking Bad",
      episodeTitle: "The One",
      size: 1073741824,
      sizeleft: 536870912,
      trackedDownloadState: "downloading",
    },
  ],
});
```

#### SABnzbd

```typescript
mocks.sabnzbd.success("https://sabnzbd.example.com", {
  speed: "25.5 MB/s",
  timeleft: "00:15:30",
  queueSize: 5,
  downloading: true,
  slots: [
    {
      filename: "Ubuntu.24.04.iso",
      percentage: 45.5,
      timeleft: "00:15:30",
      mb: "4096",
    },
  ],
});
```

#### qBittorrent

```typescript
mocks.qbittorrent.success("https://qbittorrent.example.com", {
  globalDlSpeed: 5242880,
  globalUpSpeed: 1048576,
  downloads: [
    {
      name: "ubuntu-24.04-desktop-amd64.iso",
      progress: 0.45,
      dlspeed: 5242880,
      eta: 900,
      state: "downloading",
      size: 4294967296,
    },
  ],
});
```

### Networking & Security

#### AdGuard

```typescript
mocks.adguard.success("https://adguard.example.com", {
  queries: 15234,
  blocked: 2345,
  parentalBlocked: 120,
  safeSearchBlocked: 45,
});
```

#### Pi-hole

```typescript
mocks.pihole.success("https://pihole.example.com", {
  queries: 8765,
  blocked: 1234,
  percentage: 14.07,
  domainsBeingBlocked: 125432,
});
```

#### UniFi

```typescript
mocks.unifi.success("https://unifi.example.com", {
  wanBytes: 1073741824,
  lanBytes: 536870912,
  wlanBytes: 268435456,
  userCount: 25,
  guestCount: 5,
});
```

### Infrastructure

#### Proxmox

```typescript
mocks.proxmox.success("https://proxmox.example.com", {
  nodes: 2,
  vms: [
    {
      vmid: 100,
      name: "web-server",
      status: "running",
      cpu: 0.25,
      mem: 2147483648,
      maxmem: 4294967296,
    },
  ],
  containers: [
    {
      vmid: 200,
      name: "dns-server",
      status: "running",
      cpu: 0.05,
      mem: 536870912,
      maxmem: 1073741824,
    },
  ],
});
```

#### Portainer

```typescript
mocks.portainer.success("https://portainer.example.com", {
  endpoints: 2,
  stacks: 3,
  containers: 10,
  runningContainers: 8,
});
```

#### Grafana

```typescript
mocks.grafana.success("https://grafana.example.com", {
  dashboards: 15,
  alerts: 5,
  alertsFiring: 2,
});
```

### Monitoring & Weather

#### Glances

```typescript
mocks.glances.success("https://glances.example.com", {
  cpuPercent: 45.2,
  memPercent: 62.5,
  memUsed: 8589934592,
  memTotal: 17179869184,
  load: [1.2, 0.8, 0.5],
  diskReadRate: 1048576,
  diskWriteRate: 524288,
  networkRx: 1073741824,
  networkTx: 536870912,
});
```

#### OpenMeteo

```typescript
mocks.openmeteo.success({
  latitude: 51.5074,
  longitude: -0.1278,
  temperature: 18.5,
  humidity: 65,
  windSpeed: 12.3,
  weatherCode: 2, // Partly cloudy
});
```

### Other Services

#### Immich

```typescript
mocks.immich.success("https://immich.example.com", {
  photos: 5000,
  videos: 200,
  usage: 53687091200,
  usageByUser: [
    {
      userName: "Admin",
      photos: 5000,
      videos: 200,
      usage: 53687091200,
    },
  ],
});
```

#### Frigate

```typescript
mocks.frigate.success("https://frigate.example.com", {
  cameras: 4,
  detections: 15.5,
  cpuPercent: 35.0,
  memoryPercent: 45.0,
  cameraStats: [
    {
      camera: "front-door",
      fps: 5,
      skipped: 0,
      detectionEnabled: true,
    },
  ],
});
```

---

## Advanced Usage

### Custom Mock Data

You can customize any mock by passing options:

```typescript
// Radarr with custom download states
mocks.radarr.success("https://radarr.example.com", {
  queued: 5,
  downloads: [
    {
      title: "Movie 1",
      size: 2147483648,
      sizeleft: 0,
      trackedDownloadState: "importing",
    },
    {
      title: "Movie 2",
      size: 4294967296,
      sizeleft: 2147483648,
      trackedDownloadState: "failedpending",
    },
  ],
});
```

### Multiple Adapters

Setup mocks for multiple adapters in a single test:

```typescript
import { createMockAdapter, setupMultipleMocks } from "@/tests/helpers/mocks";

const mockAdapter = createMockAdapter();

setupMultipleMocks(mockAdapter, [
  {
    adapterId: "radarr",
    state: "success",
    baseUrl: "https://radarr.test",
    options: { queued: 5, movies: 50 },
  },
  {
    adapterId: "sonarr",
    state: "success",
    baseUrl: "https://sonarr.test",
    options: { queued: 3, series: 15 },
  },
  {
    adapterId: "plex",
    state: "success",
    baseUrl: "https://plex.test",
    options: { streams: 2 },
  },
]);
```

### Error Scenarios

Test various error conditions:

```typescript
// HTTP 500 error
await withMockAdapter(mocks.radarr.error("https://radarr.example.com", 500), async () => {
  await expect(radarrDefinition.fetchData!(config)).rejects.toThrow("Radarr error: 500");
});

// Unauthorized (401)
await withMockAdapter(mocks.radarr.unauthorized("https://radarr.example.com"), async () => {
  await expect(radarrDefinition.fetchData!(config)).rejects.toThrow();
});

// Network error (timeout, refused, DNS failure)
await withMockAdapter(mocks.genericPing.networkError("https://example.com"), async () => {
  await expect(someFetchFunction()).rejects.toThrow("Network request failed");
});
```

### Recording Requests

Track which requests were made during a test:

```typescript
const mockAdapter = createMockAdapter();
mockAdapter.setup(...mocks.radarr.success());

// Run your test
await radarrDefinition.fetchData!(config);

// Inspect recorded requests
const requests = mockAdapter.getRequests();
expect(requests).toHaveLength(4);
expect(requests[0].url).toContain("/api/v3/queue");
expect(requests[0].method).toBe("GET");
expect(requests[0].headers).toEqual({
  "X-Api-Key": "test-key",
});

// Clear requests for next test phase
mockAdapter.clearRequests();
```

---

## Mock Coverage

### ✅ Active Adapters (Manually Tested)

- ✅ radarr
- ✅ sonarr
- ✅ prowlarr
- ✅ seerr
- ✅ sabnzbd
- ✅ qbittorrent
- ✅ adguard
- ✅ bazarr
- ✅ tautulli
- ✅ plex
- ✅ unmanic
- ✅ apcups
- ✅ unifi
- ✅ nginx-proxy-manager
- ✅ proxmox
- ✅ proxmox-backup-server
- ✅ calibre-web

### ✅ General Widgets

- ✅ openmeteo
- ✅ datetime (client-side, no mocks needed)
- ✅ glances
- ✅ openweathermap
- ✅ search (client-side, no mocks needed)
- ✅ matrix
- ✅ pipes (client-side, no mocks needed)

### ✅ Disabled Adapters (Available but Not Manually Tested)

- ✅ emby
- ✅ jellyfin
- ✅ lidarr
- ✅ readarr
- ✅ pihole
- ✅ portainer
- ✅ traefik
- ✅ uptime-kuma
- ✅ grafana
- ✅ generic-ping
- ✅ generic-rest
- ✅ transmission
- ✅ immich
- ✅ jackett
- ✅ frigate
- ✅ homeassistant

---

## Migration Guide

### From Manual Mock Fetch to New Mocks

**Before:**

```typescript
it("fetches data", async () => {
  const mockFetch = vi.fn((url: string) => {
    if (url.includes("/queue")) {
      return Promise.resolve({
        ok: true,
        json: () => Promise.resolve({ totalRecords: 5, records: [] }),
      });
    }
    // ... more manual URL matching
  });
  vi.stubGlobal("fetch", mockFetch);

  const result = await radarrDefinition.fetchData!(config);
  // ... assertions
});
```

**After:**

```typescript
import { withMockAdapter, mocks } from "@/tests/helpers/mocks";

it("fetches data", async () => {
  await withMockAdapter(mocks.radarr.success(), async () => {
    const result = await radarrDefinition.fetchData!(config);
    expect(result.queued).toBe(5);
  });
});
```

Benefits:

- ✅ Less boilerplate
- ✅ Consistent mock data across tests
- ✅ Type-safe options
- ✅ Easy to customize
- ✅ Works in both unit and e2e tests
