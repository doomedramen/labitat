# Download Adapter Comparison: Labitat vs Homepage

> Compared on 2026-04-09. Homepage reference: `homepage/src/widgets/`

---

## Summary Table

| Feature                            | qBittorrent                                            | Transmission                   | SABnzbd                   | Jackett              |
| ---------------------------------- | ------------------------------------------------------ | ------------------------------ | ------------------------- | -------------------- |
| **Stats parity with Homepage**     | 4/4 match                                              | 4/4 match                      | 3/3 match                 | 2/2 match            |
| **Download list**                  | Yes (top 3, by speed)                                  | Yes (active only, by progress) | Yes (top 3)               | N/A                  |
| **Homepage-only features we lack** | `enableLeechProgress` toggle, `enableLeechSize` toggle | None                           | None                      | None                 |
| **Config fields**                  | 3 (url, user, pass)                                    | 4 (+ rpcUrl)                   | 2 (url, apiKey)           | 3 (+ admin pass)     |
| **Error handling**                 | Login + API errors                                     | 401/404/generic                | Generic only              | 401/404/generic      |
| **CSRF / Auth handling**           | Cookie-based login                                     | CSRF token retry               | API key in URL            | Optional cookie auth |
| **Polling interval**               | 10s                                                    | 5s                             | 10s                       | 30s                  |
| **Homepage polling**               | N/A (proxy)                                            | N/A (proxy)                    | N/A (proxy)               | N/A (proxy)          |
| **Unit format**                    | 1024-based (KiB/MiB)                                   | 1000-based (KB/MB)             | API returns pre-formatted | N/A                  |
| **Torrent state sorting**          | By dlspeed only                                        | By progress (ascending)        | N/A                       | N/A                  |
| **Homepage state sorting**         | State priority + progress                              | N/A (no download list)         | N/A                       | N/A                  |
| **Test coverage**                  | 8 tests                                                | 8 tests                        | 7 tests                   | 6 tests              |

---

## 1. qBittorrent

### Files Compared

|         | Labitat                                                            | Homepage                                                                    |
| ------- | ------------------------------------------------------------------ | --------------------------------------------------------------------------- |
| Adapter | `/Users/martin/Developer/labitat/src/lib/adapters/qbittorrent.tsx` | `homepage/src/widgets/qbittorrent/widget.js` + `component.jsx` + `proxy.js` |

### API Endpoints

| Endpoint                   | Labitat                                        | Homepage                                   |
| -------------------------- | ---------------------------------------------- | ------------------------------------------ |
| Login                      | `POST /api/v2/auth/login`                      | `POST /api/v2/auth/login` (proxy, on 403)  |
| Transfer info              | `GET /api/v2/transfer/info`                    | Not used -- computes from torrent list     |
| Torrent list (downloading) | `GET /api/v2/torrents/info?filter=downloading` | `GET /api/v2/torrents/info` (all torrents) |
| Queued count               | `GET /api/v2/torrents/info?filter=queuedDL`    | Not used -- computed from all torrents     |

### Key Differences

**1. Data source for stats: different approach, same result**

Homepage fetches ALL torrents and computes stats client-side:

```js
// Homepage component.jsx
for (let i = 0; i < torrentData.length; i += 1) {
  const torrent = torrentData[i]
  rateDl += torrent.dlspeed
  rateUl += torrent.upspeed
  if (torrent.progress === 1) completed += 1
  if (torrent.state.includes("DL") || torrent.state === "downloading") {
    leechTorrents.push(torrent)
  }
}
```

Labitat uses the dedicated `/transfer/info` endpoint for aggregate stats and separate filtered calls for torrents:

```tsx
// Labitat
const [infoRes, torrentsRes, queuedRes] = await Promise.all([
  fetch(`${baseUrl}/api/v2/transfer/info`, { headers }),
  fetch(`${baseUrl}/api/v2/torrents/info?filter=downloading`, { headers }),
  fetch(`${baseUrl}/api/v2/torrents/info?filter=queuedDL`, { headers }),
])
```

**Verdict:** Labitat's approach is more efficient (server-side aggregates vs. client-side iteration). However, Homepage's approach of fetching all torrents gives it access to the full torrent state for better sorting.

**2. Torrent sorting: Homepage is smarter**

Homepage uses a state-priority sort:

```js
const statePriority = [
  "downloading",
  "forcedDL",
  "metaDL",
  "forcedMetaDL",
  "checkingDL",
  "stalledDL",
  "queuedDL",
  "pausedDL",
]
leechTorrents.sort((a, b) => {
  const firstStateIndex = statePriority.indexOf(a.state)
  const secondStateIndex = statePriority.indexOf(b.state)
  if (firstStateIndex !== secondStateIndex)
    return firstStateIndex - secondStateIndex
  return b.progress - a.progress
})
```

Labitat sorts by download speed only:

```tsx
.sort((a, b) => b.dlspeed - a.dlspeed)
```

**Verdict:** Homepage's sorting is better -- actively downloading torrents appear first, then metaDL, then stalled. Speed-only sorting can put a fast stalled torrent above an actively downloading one.

**3. Homepage has toggleable features we lack**

Homepage supports two optional config toggles:

- `enableLeechProgress` -- controls whether download list is shown at all
- `enableLeechSize` -- controls whether file size is shown per entry

Labitat always shows the download list (when torrents exist) and always shows size.

**4. Homepage identifies leech torrents by state string, we use API filter**

Homepage checks `torrent.state.includes("DL")` on the full torrent list. Labitat uses `?filter=downloading` which the qBittorrent API handles. Both approaches are valid, but Homepage's catches more states (forcedDL, metaDL, etc.) that our filter might miss depending on qBittorrent version.

### Recommended Improvements

**Priority 1 -- Improve torrent sorting (state-priority + progress)**

```tsx
// Add to qbittorrent.tsx
const statePriority = [
  "downloading",
  "forcedDL",
  "metaDL",
  "forcedMetaDL",
  "checkingDL",
  "stalledDL",
  "queuedDL",
  "pausedDL",
]

const downloads: DownloadItem[] = torrents
  .sort((a, b) => {
    const aStateIdx = statePriority.indexOf(a.state)
    const bStateIdx = statePriority.indexOf(b.state)
    if (aStateIdx !== bStateIdx) return aStateIdx - bStateIdx
    return b.progress - a.progress // higher progress first within same state
  })
  .slice(0, 3)
  .map((t) => ({
    /* ... */
  }))
```

**Priority 2 -- Add `showDownloads` config toggle**

```tsx
// Add to configFields in qbittorrentDefinition
{
  key: "showDownloads",
  label: "Show Download List",
  type: "boolean",
  required: false,
  defaultChecked: true,
  helperText: "Show active downloads below stats",
}

// In fetchData, conditionally skip torrent detail fetch
async fetchData(config) {
  // ... login and transfer/info ...

  const showDownloads = config.showDownloads !== "false"
  let downloads: DownloadItem[] = []

  if (showDownloads) {
    const [torrentsRes, queuedRes] = await Promise.all([/* ... */])
    // ... build downloads array ...
  }

  return { /* ... */, downloads }
}
```

**Priority 3 -- Fetch all torrents and compute stats locally (like Homepage)**

This would give us access to torrent state strings for better sorting and more accurate leech counts. The `/transfer/info` endpoint is convenient but the `dlspeed`/`upspeed` aggregates may differ slightly from summing individual torrents.

---

## 2. Transmission

### Files Compared

|         | Labitat                                                             | Homepage                                                                     |
| ------- | ------------------------------------------------------------------- | ---------------------------------------------------------------------------- |
| Adapter | `/Users/martin/Developer/labitat/src/lib/adapters/transmission.tsx` | `homepage/src/widgets/transmission/widget.js` + `component.jsx` + `proxy.js` |

### API Endpoints

| Endpoint | Labitat                   | Homepage                        |
| -------- | ------------------------- | ------------------------------- |
| RPC      | `POST {url}{rpcUrl}rpc`   | `POST {url}{rpcUrl}rpc`         |
| Method   | `torrent-get` with fields | `torrent-get` with fewer fields |

### Key Differences

**1. Requested fields: Labitat requests more**

Labitat requests: `name, percentDone, rateDownload, rateUpload, sizeWhenDone, left, eta`
Homepage requests: `percentDone, status, rateDownload, rateUpload`

**Verdict:** Labitat is better here -- we request the fields needed for the download list. Homepage's component does NOT show a download list at all (only stats), so it requests fewer fields.

**2. Homepage does NOT show download list**

Homepage's Transmission component only shows 4 stat blocks (leech, download, seed, upload). Labitat additionally shows active download items with progress bars. This is a feature addition in Labitat, not a gap.

**3. CSRF token handling: nearly identical**

Both handle the 409 CSRF challenge. Homepage caches the token in memory between requests. Labitat does a two-step fetch (first to get token, second with token) on every poll. Homepage's approach is slightly more efficient.

Homepage:

```js
let headers = cache.get(`${headerCacheKey}.${service}`)
// ... on 409, extract and cache token ...
cache.put(`${headerCacheKey}.${service}`, headers)
```

Labitat:

```tsx
// First request to get CSRF token
let csrfToken = ""
try {
  const initRes = await fetch(rpcEndpoint, {
    /* ... */
  })
  csrfToken = initRes.headers.get("X-Transmission-Session-Id") ?? ""
} catch {
  /* ignore */
}

// Second request with token
const res = await fetch(rpcEndpoint, {
  headers: { "X-Transmission-Session-Id": csrfToken },
})
```

**4. Unit formatting: 1000-based vs 1024-based**

Labitat uses 1000-based formatting (KB = 1000 bytes):

```tsx
function formatBytes(bytes: number): string {
  if (bytes >= 1_000_000_000) return `${(bytes / 1_000_000_000).toFixed(1)} GB`
  // ...
}
```

Homepage uses `common.byterate` which is SI (1000-based) for Transmission. This is consistent.

**5. Homepage proxy caches CSRF headers; we don't**

Homepage's proxy handler caches the CSRF token across requests, avoiding the 409 challenge on every poll. Labitat re-challenges every time.

### Recommended Improvements

**Priority 1 -- Cache CSRF token across polls**

```tsx
// At module level in transmission.tsx
const csrfTokenCache = new Map<string, { token: string; timestamp: number }>()
const CSRF_CACHE_TTL = 60_000 // 1 minute

async function getCachedCsrfToken(
  rpcEndpoint: string,
  auth: string,
  serviceKey: string
): Promise<string> {
  const cached = csrfTokenCache.get(serviceKey)
  if (cached && Date.now() - cached.timestamp < CSRF_CACHE_TTL) {
    return cached.token
  }

  const initRes = await fetch(rpcEndpoint, {
    method: "POST",
    headers: {
      Authorization: `Basic ${auth}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({ method: "session-get", arguments: {} }),
  })

  const token = initRes.headers.get("X-Transmission-Session-Id") ?? ""
  if (token) {
    csrfTokenCache.set(serviceKey, { token, timestamp: Date.now() })
  }
  return token
}
```

**Priority 2 -- Add `showDownloads` config toggle**

Same pattern as qBittorrent. Currently the download list is always built. Adding a toggle lets users who only want stats skip the extra data processing.

**Priority 3 -- Add `status` field to requested fields**

Homepage requests the `status` field. While we compute state from `percentDone` and `left`, having `status` would let us distinguish between downloading, seeding, and stopped torrents more accurately.

---

## 3. SABnzbd

### Files Compared

|         | Labitat                                                        | Homepage                                                   |
| ------- | -------------------------------------------------------------- | ---------------------------------------------------------- |
| Adapter | `/Users/martin/Developer/labitat/src/lib/adapters/sabnzbd.tsx` | `homepage/src/widgets/sabnzbd/widget.js` + `component.jsx` |

### API Endpoints

| Endpoint  | Labitat                                        | Homepage                                             |
| --------- | ---------------------------------------------- | ---------------------------------------------------- |
| Queue API | `GET /api?output=json&apikey={key}&mode=queue` | `GET {url}/api/?apikey={key}&output=json&mode=queue` |

**Verdict:** Identical API usage.

### Key Differences

**1. Homepage does NOT show download list**

Homepage's SABnzbd component shows only 3 stat blocks (rate, queue count, timeleft). Labitat additionally shows the top 3 queue items with progress bars. This is a Labitat feature addition.

**2. Speed formatting: Homepage converts from units, we use API value**

Homepage parses the speed string and converts it to bytes for consistent formatting:

```js
function fromUnits(value) {
  const units = ["B", "K", "M", "G", "T", "P"]
  const [number, unit] = value.split(" ")
  const index = units.indexOf(unit)
  if (index === -1) return 0
  return parseFloat(number) * 1024 ** index
}
// Then: t("common.byterate", { value: fromUnits(queueData.queue.speed) })
```

Labitat passes the API's pre-formatted speed string directly:

```tsx
speed: queue.speed ?? "0 B/s",
```

**Verdict:** Homepage's approach is more consistent with its own formatting across all widgets. Labitat's approach is simpler and preserves SABnzbd's own formatting. Both are valid. However, if the user wants consistent formatting across all dashboard widgets, Homepage's approach is better.

**3. Stats displayed: same 3 stats, different labels**

| Stat  | Labitat                 | Homepage                              |
| ----- | ----------------------- | ------------------------------------- |
| Speed | "Speed" (or "Idle")     | "Rate" (i18n: `sabnzbd.rate`)         |
| Queue | "Queue" (count)         | "Queue" (count)                       |
| Time  | "Left" (or "Idle"/"--") | "Timeleft" (i18n: `sabnzbd.timeleft`) |

**Verdict:** Functionally equivalent.

**4. Homepage has no download list, we do**

Labitat shows the top 3 queue slots with filename, progress, timeleft, and size. This is strictly more information.

### Recommended Improvements

**Priority 1 -- Add `showDownloads` config toggle**

Same pattern as above. Let users opt out of the download list.

**Priority 2 -- Add history endpoint for completed downloads**

SABnzbd has a `mode=history` endpoint that shows recently completed downloads. Homepage does not use this, but it could be a useful addition:

```tsx
// Add to configFields
{
  key: "showHistory",
  label: "Show Recent History",
  type: "boolean",
  required: false,
  defaultChecked: false,
}

// In fetchData
if (config.showHistory === "true") {
  const historyRes = await fetch(`${baseUrl}/api?output=json&apikey=${config.apiKey}&mode=history&limit=3`)
  // ... parse and add to payload ...
}
```

**Priority 3 -- Add disk space / pause state info**

SABnzbd's queue API also returns `diskspace1`, `diskspace2`, `paused`, and `pause_int`. These could be useful stats:

```tsx
// Additional stats from queue API
const diskSpace1 = parseFloat(queue.diskspace1 ?? "0")
const isPaused = queue.paused === "1"

return {
  // ... existing fields ...
  diskSpace: `${diskSpace1.toFixed(1)} GB`,
  isPaused,
}
```

---

## 4. Jackett

### Files Compared

|         | Labitat                                                        | Homepage                                                                |
| ------- | -------------------------------------------------------------- | ----------------------------------------------------------------------- |
| Adapter | `/Users/martin/Developer/labitat/src/lib/adapters/jackett.tsx` | `homepage/src/widgets/jackett/widget.js` + `component.jsx` + `proxy.js` |

### API Endpoints

| Endpoint         | Labitat                                               | Homepage                                                   |
| ---------------- | ----------------------------------------------------- | ---------------------------------------------------------- |
| Indexers         | `GET /api/v2.0/indexers?apikey={key}&configured=true` | `GET {url}/api/v2.0/indexers?apikey={key}&configured=true` |
| Login (optional) | `POST /UI/Dashboard`                                  | `POST {url}/UI/Dashboard`                                  |

**Verdict:** Identical API usage.

### Key Differences

**1. Nearly identical implementations**

Both adapters:

- Fetch configured indexers from the same endpoint
- Count errored indexers by checking `last_error` field
- Support optional admin password authentication via `/UI/Dashboard`
- Display 2 stats: configured count and errored count

**2. Error counting: functionally identical**

Homepage:

```js
const errored = indexersData.filter((indexer) => indexer.last_error)
```

Labitat:

```tsx
const errored = indexersData.filter((i) => i.last_error).length
```

**Verdict:** Identical logic.

**3. Cookie handling: slightly different**

Homepage's proxy extracts the cookie from response headers params:

```js
return params?.headers?.Cookie
```

Labitat uses `response.headers.get("set-cookie")`:

```tsx
const cookie = loginRes.headers.get("set-cookie")
```

Both are valid. Labitat's approach uses the standard Response API; Homepage's uses its custom httpProxy wrapper.

**4. No download list (expected)**

Jackett is an indexer manager, not a download client. Neither implementation shows download lists. This is correct.

### Recommended Improvements

**Priority 1 -- Add indexer names to errored list**

Currently we only show the count of errored indexers. Showing which indexers are errored would be more actionable:

```tsx
// In JackettData type
type JackettData = {
  configured: number
  errored: number
  erroredIndexers?: string[] // NEW: names of errored indexers
}

// In fetchData
const erroredIndexers = indexersData
  .filter((i: { last_error: unknown; name: string }) => i.last_error)
  .map((i: { name: string }) => i.name)

return {
  configured: indexersData.length,
  errored: erroredIndexers.length,
  erroredIndexers,
}
```

**Priority 2 -- Add `showErrored` config toggle**

Let users choose whether to see the list of errored indexers:

```tsx
// Add to configFields
{
  key: "showErrored",
  label: "Show Errored Indexers",
  type: "boolean",
  required: false,
  defaultChecked: false,
}
```

---

## Cross-Cutting Recommendations

### 1. Add `showDownloads` toggle to all download adapters (qBittorrent, Transmission, SABnzbd)

All three download adapters unconditionally build and return download lists. Adding a boolean config field lets users who only want stats avoid the overhead.

```tsx
// Pattern to add to each adapter's configFields
{
  key: "showDownloads",
  label: "Show Download List",
  type: "boolean",
  required: false,
  defaultChecked: true,
  helperText: "Show active downloads below stats",
}
```

### 2. Standardize `formatBytes` across adapters

qBittorrent uses 1024-based (binary) formatting. Transmission uses 1000-based (SI) formatting. This inconsistency means the same byte value displays differently across widgets.

**Recommendation:** Create a shared `formatBytes` utility in a common file and use it everywhere:

```tsx
// src/lib/adapters/utils/format.ts
export function formatBytes(bytes: number, base: 1000 | 1024 = 1024): string {
  if (bytes === 0) return "0 B"
  const sizes = ["B", "KB", "MB", "GB", "TB"]
  const i = Math.floor(Math.log(bytes) / Math.log(base))
  return `${(bytes / Math.pow(base, i)).toFixed(1)} ${sizes[i]}`
}

export function formatSpeed(
  bytesPerSec: number,
  base: 1000 | 1024 = 1024
): string {
  return `${formatBytes(bytesPerSec, base)}/s`
}
```

### 3. Add `formatTime` utility (shared)

Both qBittorrent and Transmission have nearly identical `formatTime` functions with slightly different output formats. Standardize:

```tsx
// src/lib/adapters/utils/format.ts
export function formatTime(seconds: number, compact = false): string {
  if (seconds < 0 || !isFinite(seconds)) return "\u221E"
  const h = Math.floor(seconds / 3600)
  const m = Math.floor((seconds % 3600) / 60)
  const s = Math.floor(seconds % 60)
  if (compact) {
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}h`
    return `${m} min`
  }
  if (h > 0)
    return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`
  return `${m}:${s.toString().padStart(2, "0")}`
}
```

### 4. Improve error messages with context

SABnzbd has the weakest error handling -- only `SABnzbd error: ${status}`. Add context like the other adapters:

```tsx
// In sabnzbd.tsx fetchData
if (!res.ok) {
  if (res.status === 401 || res.status === 403)
    throw new Error("Invalid SABnzbd API key")
  if (res.status === 404) throw new Error("SABnzbd not found at this URL")
  throw new Error(`SABnzbd error: ${res.status}`)
}
```

### 5. Consider adding total downloaded/uploaded stats

Homepage's qBittorrent proxy has access to full torrent data including `amount_left`, `completed`, etc. These could be additional stats:

- **qBittorrent:** total downloaded today, total uploaded today
- **Transmission:** same
- **SABnzbd:** total queue size remaining

---

## Priority Ranking

| Priority | Improvement                                          | Adapters                           | Effort | Impact |
| -------- | ---------------------------------------------------- | ---------------------------------- | ------ | ------ |
| **P0**   | Improve qBittorrent torrent sorting (state-priority) | qBittorrent                        | Low    | High   |
| **P1**   | Add `showDownloads` toggle                           | qBittorrent, Transmission, SABnzbd | Low    | Medium |
| **P1**   | Standardize `formatBytes` / `formatTime` utilities   | All download                       | Medium | Medium |
| **P2**   | Cache Transmission CSRF token                        | Transmission                       | Low    | Low    |
| **P2**   | Improve SABnzbd error messages                       | SABnzbd                            | Low    | Low    |
| **P2**   | Add errored indexer names to Jackett                 | Jackett                            | Low    | Medium |
| **P3**   | Add SABnzbd disk space / pause state                 | SABnzbd                            | Low    | Low    |
| **P3**   | Add SABnzbd history endpoint support                 | SABnzbd                            | Medium | Low    |
| **P3**   | Add `showErrored` toggle to Jackett                  | Jackett                            | Low    | Low    |

---

## Conclusion

Labitat's download adapters are **feature-complete or ahead of Homepage** in most areas:

- **qBittorrent:** We show download lists (Homepage does too), but our sorting is inferior. Homepage's state-priority sort is better.
- **Transmission:** We show download lists (Homepage does NOT). We are ahead here.
- **SABnzbd:** We show download lists (Homepage does NOT). We are ahead here.
- **Jackett:** Nearly identical. We could add errored indexer names for more detail.

The most impactful single change is **improving qBittorrent's torrent sorting** to match Homepage's state-priority approach. Everything else is incremental improvement.
