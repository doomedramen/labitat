# Specialized Adapters Comparison: Labitat vs Homepage

Date: 2026-04-09

This document compares our 10 remaining specialized adapters against Homepage's widget implementations. For each adapter we examine Homepage's `widget.js` (API mapping/proxy config) and `component.jsx` (UI rendering), then compare against our unified `*.tsx` adapter.

---

## 1. Seerr (Overseerr)

### Homepage Implementation

**`widget.js`** -- Uses `credentialedProxyHandler` with two mappings:

- `request/count` -- validates `pending`, `approved`, `available`
- `issue/count` -- validates `open`, `total` (optional, enabled via widget fields)

**`component.jsx`** -- Features:

- Default fields: `["pending", "approved", "completed"]` (max 4 fields)
- Optional issue count display (when `fields` includes `"issues"`)
- Fallback: if `completed` is undefined (older Overseerr), falls back to `available`
- Shows: pending, approved, available, completed, processing, issues

### Our Implementation (`/Users/martin/Developer/labitat/src/lib/adapters/seerr.tsx`)

- Fetches `request/count` only
- Shows: pending, approved, available, processing (4 stats)
- No issue count support
- No `completed` field (uses `available` instead)
- No fallback logic for older/newer Overseerr versions

### Differences

| Aspect              | Homepage                          | Ours                  |
| ------------------- | --------------------------------- | --------------------- |
| Issue count         | Supported (optional)              | Not supported         |
| `completed` field   | Yes, with fallback to `available` | Uses `available` only |
| Configurable fields | User-selectable (max 4)           | Fixed 4 stats         |
| API calls           | 1-2 (request + optional issues)   | 1 (request only)      |

### Improvements Identified

1. **Add issue count support** -- Homepage fetches `issue/count` as an optional second endpoint. We could add this as an optional config flag.
2. **Add `completed` field** -- Newer Overseerr versions use `completed` instead of `available`. We should fetch both and prefer `completed` when available.
3. **Consider configurable stats** -- Homepage lets users pick which fields to show.

---

## 2. Lidarr

### Homepage Implementation

**`widget.js`** -- Uses `genericProxyHandler` with mappings:

- `artist`, `wanted/missing`, `queue/status`, `calendar` (with params)

**`component.jsx`** -- Features:

- Three stats: wanted (`totalRecords`), queued (`totalCount`), artists (`length`)
- Uses `t("common.number")` for i18n-formatted numbers

### Our Implementation (`/Users/martin/Developer/labitat/src/lib/adapters/lidarr.tsx`)

- Fetches all three endpoints in parallel (`Promise.all`)
- Same three stats: wanted, queued, artists
- Uses `.toLocaleString()` for number formatting
- Graceful fallback: if `wanted/missing` or `queue/status` fail, defaults to `{ totalRecords: 0 }` / `{ totalCount: 0 }`
- Specific error messages for 401/404

### Differences

| Aspect            | Homepage                                 | Ours                                         |
| ----------------- | ---------------------------------------- | -------------------------------------------- |
| Stats shown       | wanted, queued, artists                  | wanted, queued, artists                      |
| Number formatting | i18n `t("common.number")`                | `.toLocaleString()`                          |
| Error resilience  | All-or-nothing (any error = error state) | Graceful fallback for non-critical endpoints |
| Calendar endpoint | Supported                                | Not supported                                |
| Helper text       | N/A (config via YAML)                    | Has helperText for config fields             |

### Improvements Identified

1. **Our error handling is superior** -- We gracefully degrade when secondary endpoints fail, whereas Homepage requires all three to succeed.
2. **Calendar endpoint** -- Homepage supports a calendar endpoint; we could add this as an optional feature.
3. **Both implementations are functionally equivalent** for the core use case.

---

## 3. Readarr

### Homepage Implementation

**`widget.js`** -- Uses `genericProxyHandler` with mappings:

- `book` -- with a `map` function that filters books where `statistics.bookFileCount > 0` to compute `have`
- `queue/status`, `wanted/missing`, `calendar`

**`component.jsx`** -- Features:

- Three stats: wanted (`totalRecords`), queued (`totalCount`), books (`have`)
- Uses `t("common.number")` for formatting

### Our Implementation (`/Users/martin/Developer/labitat/src/lib/adapters/readarr.tsx`)

- Fetches all three endpoints in parallel
- Uses `booksData.have ?? 0` directly from the API response
- Graceful fallback for non-critical endpoints
- Specific error messages for 401/404

### Differences

| Aspect                 | Homepage                                       | Ours                                |
| ---------------------- | ---------------------------------------------- | ----------------------------------- |
| Book count calculation | Filters array client-side: `bookFileCount > 0` | Uses `have` field directly from API |
| Stats shown            | wanted, queued, books                          | wanted, queued, books               |
| Error resilience       | All-or-nothing                                 | Graceful fallback                   |
| Calendar endpoint      | Supported                                      | Not supported                       |

### Improvements Identified

1. **Potential data accuracy issue** -- Homepage computes `have` by filtering the book array where `bookFileCount > 0`. We use `booksData.have` directly. If the Readarr API does not return a `have` field on the book array, our count would be 0. **This is a potential bug** -- we should verify the Readarr API returns `have` on the book list endpoint, or implement the same filtering logic.
2. **Calendar endpoint** -- Same as Lidarr, could be added optionally.
3. **Our error handling is superior** for the same reasons as Lidarr.

---

## 4. Calibre-Web

### Homepage Implementation

**`widget.js`** -- Uses `genericProxyHandler`:

- Maps `stats` to `opds/stats` endpoint

**`component.jsx`** -- Features:

- Four stats: books, authors, categories, series
- Uses `t("common.number")` for formatting
- Fetches from the OPDS stats endpoint (structured JSON API)

### Our Implementation (`/Users/martin/Developer/labitat/src/lib/adapters/calibre-web.tsx`)

- Uses **session-based login** (POST to `/login`, then cookie-based auth)
- **HTML scraping** -- parses the main page HTML with regex to extract stats
- Four stats: books, authors, series, **formats** (Homepage has **categories** instead of formats)
- No structured API usage

### Differences

| Aspect      | Homepage                             | Ours                            |
| ----------- | ------------------------------------ | ------------------------------- |
| Data source | `opds/stats` JSON endpoint           | HTML scraping from main page    |
| Auth method | genericProxyHandler (API key in URL) | Session login with cookies      |
| Stats shown | books, authors, categories, series   | books, authors, series, formats |
| Reliability | High (structured API)                | Low (HTML parsing, regex-based) |
| Config      | URL only                             | URL + username + password       |

### Improvements Identified

1. **CRITICAL: Switch to OPDS stats endpoint** -- Homepage uses `/opds/stats` which returns structured JSON. Our HTML scraping approach is fragile and will break on any Calibre-Web UI change. We should:
   - Remove the session login approach
   - Use the `opds/stats` endpoint directly
   - This would also eliminate the need for username/password config
2. **Add `categories` stat** -- Homepage shows categories; we show formats. Consider showing both or making configurable.
3. **Our approach requires credentials** while Homepage's OPDS endpoint may not. This is a significant UX difference.

---

## 5. Immich

### Homepage Implementation

**`widget.js`** -- Uses `credentialedProxyHandler` with mappings:

- `version` / `version_v2` -- server version detection
- `statistics` / `statistics_v2` -- server stats
- `stats` / `stats` -- legacy stats endpoint

**`component.jsx`** -- Features:

- Version detection: checks Immich version to pick correct stats endpoint
- For v1: if version > 1.84, uses `statistics` endpoint; otherwise `stats`
- For v2: uses `statistics_v2` endpoint
- Storage formatting: checks if usage is already a string (backwards compat), otherwise uses `t("common.bytes", { binary: true })`
- Four stats: users, photos, videos, storage

### Our Implementation (`/Users/martin/Developer/labitat/src/lib/adapters/immich.tsx`)

- Same version detection logic (v1 vs v2, > 1.84 check)
- Has explicit `version` config field (select: v1 or v2)
- Custom `formatStorage()` function (uses decimal: TB/GB/MB/KB)
- Four stats: users, photos, videos, storage
- Specific error messages for 401/404

### Differences

| Aspect             | Homepage                                                    | Ours                                 |
| ------------------ | ----------------------------------------------------------- | ------------------------------------ |
| Version detection  | Auto-detects from config `version` field                    | Same, but user must manually select  |
| Storage formatting | Binary (GiB, MiB) via `t("common.bytes", { binary: true })` | Decimal (GB, MB) via custom function |
| Status code check  | Checks `immichData?.statusCode === 401`                     | Checks `res.status === 401`          |
| Config             | `version` number in YAML                                    | Select dropdown for API version      |

### Improvements Identified

1. **Use binary storage units** -- Homepage uses binary (GiB/MiB) which matches what Immich displays. Our decimal units (GB/MB) will show different values. We should switch to binary formatting to match Immich's own display.
2. **Add `statusCode` check** -- Homepage also checks for `immichData?.statusCode === 401` in the response body, not just HTTP status. This catches cases where the API returns 200 with an error body.
3. **Version auto-detection** -- Homepage's approach is cleaner; our select field adds friction. Consider auto-detecting the API version.

---

## 6. Frigate

### Homepage Implementation

**`widget.js`** -- Uses custom `frigateProxyHandler`:

- Maps `stats` and `events` endpoints
- Custom proxy handles login flow (401 retry with cookie)

**`component.jsx`** -- Features:

- Three base stats: cameras (`num_cameras`), uptime (formatted via `t("common.duration")`), version
- **Optional recent events** -- when `widget.enableRecentEvents` is true, shows last 5 events with camera, label, score, and timestamp
- Events displayed as styled divs with dark/light theme support

**`proxy.js`** -- Custom proxy handler:

- Handles authentication: if 401, logs in via `/api/login` POST, sets cookie, retries
- Transforms stats response: `num_cameras`, `uptime`, `version`
- Transforms events: slices to 5, maps fields, converts `start_time` to Date

### Our Implementation (`/Users/martin/Developer/labitat/src/lib/adapters/frigate.tsx`)

- Same three base stats: cameras, uptime, version
- Same login flow (POST to `/api/login`, cookie handling)
- Same stats extraction: `Object.keys(cameras).length`, `service.uptime`, `service.version`
- **No recent events support**
- Custom `formatUptime()` function (days/hours/minutes)
- Optional username/password (not required)

### Differences

| Aspect            | Homepage                                        | Ours                     |
| ----------------- | ----------------------------------------------- | ------------------------ |
| Recent events     | Supported (last 5, with details)                | Not supported            |
| Uptime formatting | `t("common.duration")` (i18n-aware)             | Custom `formatUptime()`  |
| Auth              | Optional (tries without, then with credentials) | Optional (same approach) |
| Stats endpoint    | `/api/stats`                                    | `/api/stats`             |

### Improvements Identified

1. **Add recent events support** -- Homepage shows the last 5 detection events with camera name, label, confidence score, and timestamp. This is a significant feature gap.
2. **Use i18n-aware duration formatting** -- Homepage's `t("common.duration")` handles localization. Our hardcoded format is functional but less flexible.
3. **Our auth approach is equivalent** -- both try without credentials first, then authenticate on 401.

---

## 7. Home Assistant

### Homepage Implementation

**`widget.js`** -- Uses custom `homeassistantProxyHandler`:

- No API mapping (custom proxy only)

**`component.jsx`** -- Features:

- Dynamic rendering: maps over `data` array and renders `Block` for each item
- Each block has `label` and `value` from the proxy response

**`proxy.js``** -- Complex custom proxy:

- **Default queries**: people home, lights on, switches on (Jinja2 templates)
- **Custom queries**: users can define their own via `widget.custom` config
- Two query types:
  - `state` -- fetches a single entity state (`/api/states/{state}`)
  - `template` -- executes Jinja2 templates (`/api/template` POST)
- Output formatting with template variable substitution

### Our Implementation (`/Users/martin/Developer/labitat/src/lib/adapters/homeassistant.tsx`)

- Fetches ALL states (`/api/states`)
- Counts by domain: entities (total), sensors, lights, switches
- Fixed four stats
- Uses Bearer token auth
- Uses `.toLocaleString()` for formatting

### Differences

| Aspect         | Homepage                                                    | Ours                                       |
| -------------- | ----------------------------------------------------------- | ------------------------------------------ |
| Approach       | Template-based queries (Jinja2)                             | Full state fetch + client-side counting    |
| Customization  | Highly customizable (custom queries)                        | Fixed stats                                |
| Stats shown    | Configurable (default: people home, lights on, switches on) | Fixed: entities, sensors, lights, switches |
| Data model     | Query results with labels                                   | Domain counts                              |
| API efficiency | Targeted queries                                            | Fetches ALL states                         |
| Network usage  | Multiple small requests                                     | One large request                          |

### Improvements Identified

1. **Fundamentally different approaches** -- Homepage uses Jinja2 templates for targeted queries; we fetch all states and count. Both are valid but serve different use cases:
   - Homepage: "How many lights are ON?" (state-based)
   - Ours: "How many lights exist?" (count-based)
2. **Consider adding custom query support** -- Homepage's template system is powerful. We could add a `queries` config option for custom Jinja2-like templates.
3. **Our approach is simpler but less informative** -- Knowing you have 50 sensors is less useful than knowing 3 lights are on. Consider adding state-based stats as an option.
4. **API efficiency** -- Fetching all states can be heavy for large HA installations. Homepage's targeted approach is more efficient.

---

## 8. Proxmox Backup Server

### Homepage Implementation

**`widget.js`** -- Uses `credentialedProxyHandler`:

- `status/datastore-usage` -- datastore info
- `nodes/localhost/tasks` -- recent tasks (last 24h, errors only, limit 100)
- `nodes/localhost/status` -- host status (CPU, memory)

**`component.jsx`** -- Features:

- Four stats: datastore usage (%), failed tasks (24h), CPU usage (%), memory usage (%)
- Optional single datastore filtering via `widget.datastore`
- Percentage calculations with `highlightValue` for visual emphasis
- Failed tasks capped at "99+" if >= 100

### Our Implementation (`/Users/martin/Developer/labitat/src/lib/adapters/proxmox-backup-server.tsx`)

- Login via `/api2/json/access/ticket` (username/password)
- Fetches datastores only
- Four stats: stores (count), snaps (count), used space, total space
- **No CPU/memory monitoring**
- **No failed tasks tracking**
- Custom `formatBytes()` function
- Snapshot count from first datastore only

### Differences

| Aspect              | Homepage                                | Ours                                     |
| ------------------- | --------------------------------------- | ---------------------------------------- |
| Stats shown         | Usage %, failed tasks, CPU %, memory %  | Store count, snapshot count, used, total |
| Datastore filtering | Supports single datastore selection     | Aggregates all datastores                |
| Task monitoring     | Failed tasks in last 24h                | Not supported                            |
| Host monitoring     | CPU and memory usage                    | Not supported                            |
| Auth                | credentialedProxyHandler (cookie-based) | Manual ticket login                      |
| Space display       | Percentage                              | Absolute bytes (formatted)               |

### Improvements Identified

1. **Add CPU and memory monitoring** -- Homepage monitors host CPU and memory usage via `nodes/localhost/status`. This is valuable operational data we're missing.
2. **Add failed tasks tracking** -- Homepage shows failed tasks from the last 24h. This is critical for backup monitoring.
3. **Show percentage usage** -- Homepage shows datastore usage as a percentage, which is more immediately actionable than absolute bytes.
4. **Consider both absolute and percentage** -- We could show both: "1.2 TB / 4 TB (30%)" for maximum usefulness.
5. **Our snapshot count is limited** -- We only count snapshots from the first datastore. Homepage aggregates across all. We should fix this.

---

## 9. APC UPS

### Homepage Implementation

**`widget.js`** -- Uses custom `apcupsProxyHandler`:

- No API mapping (custom proxy only)

**`component.jsx`** -- Features:

- Four stats: status, load, bcharge (battery charge), timeleft

**`proxy.js`** -- Custom proxy:

- **Raw TCP socket connection** to apcupsd daemon on port 3551
- Sends binary protocol command (`status`)
- Parses binary response format (length-prefixed ASCII lines)
- Extracts: STATUS, LOADPCT, BCHARGE, TIMELEFT
- Connects to `hostname:port` from the URL

### Our Implementation (`/Users/martin/Developer/labitat/src/lib/adapters/apcups.tsx`)

- Fetches `multimon.cgi` web page via HTTP
- **HTML scraping** with regex to extract values
- Five data points: loadPercent, batteryCharge, timeLeft, temperature, status
- **Status-aware**: sets `_status` to "warn" if not "ONLINE"
- Includes temperature (Homepage does not)

### Differences

| Aspect             | Homepage                             | Ours                                |
| ------------------ | ------------------------------------ | ----------------------------------- |
| Protocol           | Raw TCP (port 3551, binary protocol) | HTTP (multimon.cgi web interface)   |
| Data source        | apcupsd daemon directly              | Web CGI interface                   |
| Stats shown        | status, load, bcharge, timeleft      | load%, battery%, time, temp, status |
| Temperature        | Not shown                            | Shown                               |
| Status awareness   | Raw status string                    | Auto-sets warn status if not ONLINE |
| Server requirement | Direct TCP access to apcupsd         | Web server with CGI enabled         |

### Improvements Identified

1. **Different protocols, different requirements** -- Homepage connects directly to the apcupsd daemon (TCP 3551), which is the standard setup. We use the web CGI interface, which requires a web server with CGI enabled. **Our approach is less common** -- most users run apcupsd without the CGI web interface.
2. **Consider supporting both protocols** -- The TCP approach (Homepage's) is more universal. We could add a `protocol` config option: `"tcp"` (direct daemon) or `"http"` (CGI web interface).
3. **Our temperature stat is a nice addition** -- Homepage doesn't show temperature.
4. **Our status-aware `_status` is superior** -- We automatically set warn status when UPS is not ONLINE. Homepage just displays the raw status string.

---

## 10. Bazarr

### Homepage Implementation

**`widget.js`** -- Uses `genericProxyHandler`:

- `movies` -- maps to `/api/movies/wanted`, extracts `total`
- `episodes` -- maps to `/api/episodes/wanted`, extracts `total`

**`component.jsx`** -- Features:

- Two stats: missing episodes, missing movies
- Uses `t("common.number")` for formatting
- Fetches both endpoints independently

### Our Implementation (`/Users/martin/Developer/labitat/src/lib/adapters/bazarr.tsx`)

- Fetches `/api/badges` endpoint (single request)
- Two stats: missingMovies, missingEpisodes
- Uses raw numbers (no formatting)

### Differences

| Aspect            | Homepage                                                   | Ours                                |
| ----------------- | ---------------------------------------------------------- | ----------------------------------- |
| API endpoint      | `/api/movies/wanted` + `/api/episodes/wanted` (2 requests) | `/api/badges` (1 request)           |
| Data extraction   | `total` from each endpoint                                 | `movies` and `episodes` from badges |
| Number formatting | `t("common.number")`                                       | Raw numbers                         |
| API calls         | 2                                                          | 1                                   |

### Improvements Identified

1. **Our single-request approach is more efficient** -- We use `/api/badges` which returns both counts in one request. Homepage makes two separate requests.
2. **Verify API endpoint compatibility** -- The `/api/badges` endpoint may be specific to certain Bazarr versions. Homepage's approach of hitting the `wanted` endpoints directly is more universally compatible. We should verify our endpoint works across Bazarr versions.
3. **Add number formatting** -- Use `.toLocaleString()` for consistency with other adapters.
4. **Both approaches are valid** -- Ours is more efficient; Homepage's is more explicit and potentially more compatible.

---

## Summary of Key Improvements

### High Priority

| #   | Adapter     | Improvement                                                       | Effort |
| --- | ----------- | ----------------------------------------------------------------- | ------ |
| 1   | Calibre-Web | Switch from HTML scraping to `opds/stats` JSON endpoint           | Medium |
| 2   | Readarr     | Verify `booksData.have` field exists or implement filtering logic | Low    |
| 3   | Proxmox BS  | Add CPU, memory, and failed tasks monitoring                      | Medium |
| 4   | APC UPS     | Add TCP protocol support (direct apcupsd daemon)                  | Medium |
| 5   | Frigate     | Add recent events display                                         | Medium |

### Medium Priority

| #   | Adapter        | Improvement                                   | Effort |
| --- | -------------- | --------------------------------------------- | ------ |
| 6   | Seerr          | Add issue count support                       | Low    |
| 7   | Immich         | Switch to binary storage units (GiB/MiB)      | Low    |
| 8   | Home Assistant | Add custom query/template support             | High   |
| 9   | Bazarr         | Add `.toLocaleString()` formatting            | Low    |
| 10  | Immich         | Add `statusCode` body check for 401 detection | Low    |

### Low Priority / Nice-to-Have

| #   | Adapter        | Improvement                           | Effort |
| --- | -------------- | ------------------------------------- | ------ |
| 11  | Seerr          | Add `completed` field with fallback   | Low    |
| 12  | Lidarr/Readarr | Add calendar endpoint                 | Low    |
| 13  | Proxmox BS     | Show percentage + absolute space      | Low    |
| 14  | Proxmox BS     | Count snapshots across all datastores | Low    |
| 15  | Home Assistant | Add state-based stats (ON counts)     | Medium |

---

## Architecture Comparison

### Homepage's Architecture

- **Proxy-based**: All API calls go through a Next.js API proxy layer
- **Separation**: `widget.js` defines API mappings, `component.jsx` handles UI, `proxy.js` handles custom logic
- **i18n**: Full internationalization via `next-i18next`
- **Configurable**: Users can customize which fields to display via YAML config
- **Server-side**: Proxy runs on the server, hiding API keys from the browser

### Our Architecture

- **Unified adapters**: Each adapter is a single file with config, fetch, and payload transformation
- **TypeScript**: Full type safety with `ServiceDefinition<T>` generic
- **Client-side**: Fetch runs in the browser (API keys stored in local state)
- **Self-contained**: No proxy layer needed; adapters are portable
- **Lucide icons**: Consistent icon system across all adapters

### Key Trade-offs

- **Security**: Homepage's proxy hides API keys; our approach exposes them to the browser (acceptable for self-hosted dashboards)
- **Flexibility**: Homepage's configurable fields vs our fixed stats
- **Simplicity**: Our single-file approach is easier to understand and maintain
- **Error handling**: Our adapters generally have better error resilience with graceful fallbacks
