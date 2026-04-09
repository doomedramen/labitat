# Monitoring Adapters Comparison: Labitat vs Homepage

> Compared on 2026-04-09. Labitat adapters in `src/lib/adapters/` vs Homepage widgets in `homepage/src/widgets/`.

---

## Summary Table

| Adapter         | Endpoints              | Stats/Features            | Error Handling              | Config                            | Architecture                    | Verdict       |
| --------------- | ---------------------- | ------------------------- | --------------------------- | --------------------------------- | ------------------------------- | ------------- |
| **Glances**     | Homepage: 11 endpoints | Homepage: 10 metric views | Homepage: per-metric        | Homepage: version, chart, refresh | Homepage: far richer            | Homepage wins |
| **Pi-hole**     | Labitat: 2 (v5+v6)     | Equal: 4 stats            | Labitat: better messages    | Labitat: cleaner                  | Labitat: simpler                | Labitat wins  |
| **AdGuard**     | Equal: 1 endpoint      | Labitat: 6 stats          | Equal                       | Equal                             | Labitat: richer data            | Labitat wins  |
| **Uptime Kuma** | Equal: 2 endpoints     | Homepage: 4 stats         | Homepage: incident tracking | Equal                             | Homepage: more data             | Homepage wins |
| **Grafana**     | Equal: 2 endpoints     | Equal: 4 stats            | Labitat: better messages    | Labitat: helper text              | Homepage: alertmanager fallback | Homepage wins |

---

## 1. Glances

### Files Compared

- **Labitat:** `/Users/martin/Developer/labitat/src/lib/adapters/glances.tsx`
- **Homepage:** `/Users/martin/Developer/labitat/homepage/src/widgets/glances/widget.js` + `component.jsx` + `metrics/` (10 metric components)

### Endpoints

| Aspect           | Labitat                          | Homepage                                                                                                                                                             |
| ---------------- | -------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| API endpoints    | `/api/4/quicklook`, `/api/4/mem` | `/api/{version}/{endpoint}` with 11 allowed endpoints: `quicklook`, `diskio`, `cpu`, `fs`, `gpu`, `system`, `mem`, `network`, `processlist`, `sensors`, `containers` |
| API version      | Hardcoded to v4                  | Configurable (v3 or v4) via `version` field                                                                                                                          |
| Parallel fetches | 2 (quicklook + mem)              | 1-2 per metric view                                                                                                                                                  |

### Data & Stats

| Aspect       | Labitat                                       | Homepage                                                                                             |
| ------------ | --------------------------------------------- | ---------------------------------------------------------------------------------------------------- |
| Stats shown  | CPU%, RAM%, RAM used, Swap%, Load avg, Uptime | Depends on metric view selected                                                                      |
| Metric views | Single unified view                           | **10 separate metric views**: info, memory, process, containers, cpu, network, sensor, disk, gpu, fs |
| Charts       | No                                            | Yes -- every metric view supports chart mode with historical data points                             |
| Per-CPU data | No                                            | Yes (via `percpu` in quicklook)                                                                      |
| Disk I/O     | No                                            | Yes (read/write rates per disk)                                                                      |
| Network I/O  | No                                            | Yes (rx/tx per interface)                                                                            |
| Process list | No                                            | Yes (top 5 processes with CPU%, memory, status icons)                                                |
| GPU metrics  | No                                            | Yes (per-GPU utilization)                                                                            |
| Filesystem   | No                                            | Yes (per-mount-point usage)                                                                          |
| Sensors      | No                                            | Yes (temperature, fan speed, etc.)                                                                   |
| Containers   | No                                            | Yes (Docker container status)                                                                        |
| System info  | No                                            | Yes (hostname, OS version, distro)                                                                   |

### Error Handling

| Aspect         | Labitat                                       | Homepage                                          |
| -------------- | --------------------------------------------- | ------------------------------------------------- |
| API errors     | Throws `Error` with status code               | Per-metric error display in UI                    |
| Fallbacks      | Falls back mem from quicklook if `/mem` fails | Each metric handles its own errors independently  |
| Loading states | Implicit (React suspense)                     | Explicit loading skeleton with placeholder blocks |

### Configuration

| Aspect           | Labitat                                 | Homepage                                                      |
| ---------------- | --------------------------------------- | ------------------------------------------------------------- |
| URL              | Required                                | Required (template: `{url}/api/{endpoint}`)                   |
| Auth             | Optional username/password (Basic auth) | Via credentialed proxy handler                                |
| Metric selection | Not applicable (always shows all)       | `widget.metric` field selects which view                      |
| Chart mode       | Not supported                           | `chart` boolean enables time-series charts                    |
| Refresh interval | Fixed 10s default                       | Configurable per metric (default 1s for charts, 5s for stats) |
| Version          | Hardcoded v4                            | Configurable v3 or v4                                         |

### What Labitat Does Better

- **Unified view**: Single widget shows all key stats at once -- no configuration needed
- **TypeScript**: Fully typed data flow from fetch to render
- **Cleaner architecture**: Single `fetchData` + `renderWidget` pattern, no proxy layer needed
- **Load normalization**: Divides load by CPU core count for meaningful single-number display
- **Uptime formatting**: Handles both numeric seconds and pre-formatted strings

### What Homepage Does Better

- **Breadth of metrics**: 10 different metric views vs 1 unified view -- vastly more data available
- **Time-series charts**: Every metric supports historical charting with configurable data points
- **Per-resource detail**: Disk I/O per disk, network per interface, processes by name, GPU per GPU
- **Configurable refresh rates**: Different intervals for different data types (system info every 30s, CPU every 1s)
- **API version flexibility**: Supports both Glances v3 and v4 APIs
- **Container monitoring**: Docker container status integration

### Recommendations (Priority)

1. **[HIGH] Add metric view selection**: Allow users to choose between info, cpu, memory, disk, network, process, gpu, fs, sensors, containers views instead of a single unified view
2. **[HIGH] Add time-series chart support**: Implement chart mode for at least CPU and memory metrics with configurable data points and refresh intervals
3. **[MEDIUM] Add per-resource detail views**: Disk I/O per disk, network per interface, process list with top processes
4. **[MEDIUM] Support Glances v3 API**: Add version configuration to support older Glances installations
5. **[LOW] Add configurable refresh intervals**: Allow different polling rates for different metric types
6. **[LOW] Add GPU and sensor metrics**: GPU utilization and hardware sensor data (temperature, fan speed)

---

## 2. Pi-hole

### Files Compared

- **Labitat:** `/Users/martin/Developer/labitat/src/lib/adapters/pihole.tsx`
- **Homepage:** `/Users/martin/Developer/labitat/homepage/src/widgets/pihole/widget.js` + `component.jsx` + `proxy.js`

### Endpoints

| Aspect        | Labitat                                                                      | Homepage                                   |
| ------------- | ---------------------------------------------------------------------------- | ------------------------------------------ |
| v6 API        | `/api/auth` (POST for session), `/api/stats/summary` (GET with Bearer token) | Same, via proxy with session caching       |
| v5 API        | `/admin/api.php?summaryRaw&auth={password}`                                  | `/admin/api.php?{endpoint}&auth={key}`     |
| Auth approach | Direct client-side fetch                                                     | Server-side proxy with session SID caching |

### Data & Stats

| Aspect                | Labitat                        | Homepage                                                       |
| --------------------- | ------------------------------ | -------------------------------------------------------------- |
| Queries today         | Yes (`dns_queries_today`)      | Yes                                                            |
| Ads blocked today     | Yes (`ads_blocked_today`)      | Yes                                                            |
| Ads percentage today  | Yes (`ads_percentage_today`)   | Yes (also appended to blocked count when not shown separately) |
| Domains being blocked | Yes (`domains_being_blocked`)  | Yes (called "gravity")                                         |
| Additional stats      | None                           | None                                                           |
| Data formatting       | `toLocaleString()` for numbers | i18n via `next-i18next`                                        |

### Error Handling

| Aspect          | Labitat                                          | Homepage                                  |
| --------------- | ------------------------------------------------ | ----------------------------------------- |
| v6 auth failure | Falls back to v5 API                             | Returns 500 with "Failed to authenticate" |
| v5 404          | Specific "Pi-hole not found at this URL" message | Generic proxy error                       |
| v5 other errors | `Pi-hole error: {status}`                        | Generic proxy error with status           |
| Loading state   | Implicit                                         | Explicit skeleton with placeholder blocks |

### Configuration

| Aspect            | Labitat                                | Homepage                                           |
| ----------------- | -------------------------------------- | -------------------------------------------------- |
| URL               | Required, with helper text             | Required (template)                                |
| Password          | Required (works for both v5 and v6)    | Required (`key` field)                             |
| Version detection | Automatic (tries v6, falls back to v5) | Manual (`version` field, defaults to v5)           |
| Custom fields     | Not supported                          | `widget.fields` array to customize displayed stats |

### What Labitat Does Better

- **Automatic version detection**: Tries v6 API first, seamlessly falls back to v5 -- no manual version config needed
- **Better error messages**: Specific messages for 404 ("Pi-hole not found") vs generic proxy errors
- **Simpler architecture**: No server-side proxy needed -- direct client-to-API communication
- **TypeScript**: Fully typed data flow
- **Cleaner auth flow**: Single `fetchData` function handles both auth paths

### What Homepage Does Better

- **Session caching**: Caches v6 session SID in server-side memory cache, avoiding re-auth on every request
- **Customizable fields**: Users can choose which stats to display via `widget.fields`
- **i18n**: Full internationalization support
- **Loading skeletons**: Explicit placeholder blocks during data fetch
- **Smart display**: Appends percentage to blocked count when `blocked_percent` field is not separately shown

### Recommendations (Priority)

1. **[MEDIUM] Add session caching**: For v6 API, cache the session SID to avoid re-authenticating on every poll (currently re-auths every 10s)
2. **[LOW] Add customizable field selection**: Allow users to choose which stats to display
3. **[LOW] Add i18n support**: Use translation keys instead of hardcoded English labels
4. **[LOW] Add loading state**: Show skeleton/placeholder while data is loading

---

## 3. AdGuard Home

### Files Compared

- **Labitat:** `/Users/martin/Developer/labitat/src/lib/adapters/adguard.tsx`
- **Homepage:** `/Users/martin/Developer/labitat/homepage/src/widgets/adguard/widget.js` + `component.jsx`

### Endpoints

| Aspect           | Labitat                                | Homepage                                    |
| ---------------- | -------------------------------------- | ------------------------------------------- |
| API endpoint     | `/control/stats`                       | `/control/stats` (via mapping)              |
| Auth             | Basic auth (username:password, base64) | Generic proxy handler (passes through auth) |
| Parallel fetches | 1 (with latency timing)                | 1                                           |

### Data & Stats

| Aspect                                          | Labitat                                              | Homepage                                              |
| ----------------------------------------------- | ---------------------------------------------------- | ----------------------------------------------------- |
| Total DNS queries                               | Yes (`num_dns_queries`)                              | Yes                                                   |
| Blocked by filtering                            | Yes (`num_blocked_filtering`)                        | Yes                                                   |
| Block rate percentage                           | Yes (calculated: blocked/queries \* 100)             | No (not displayed)                                    |
| Parental control blocked                        | Yes (`num_blocked_parental`)                         | No (included in "filtered" aggregate)                 |
| Safe search blocked                             | Yes (`num_blocked_safe_search`)                      | No (included in "filtered" aggregate)                 |
| Filtered (safebrowsing + safesearch + parental) | No                                                   | Yes (calculated aggregate)                            |
| Latency                                         | Yes (measured client-side: `Date.now() - startTime`) | Yes (`avg_processing_time` from API, converted to ms) |
| Total stats displayed                           | **6**                                                | **4**                                                 |

### Error Handling

| Aspect        | Labitat                   | Homepage                                  |
| ------------- | ------------------------- | ----------------------------------------- |
| API errors    | `AdGuard error: {status}` | Generic proxy error                       |
| Loading state | Implicit                  | Explicit skeleton with placeholder blocks |

### Configuration

| Aspect          | Labitat  | Homepage                                        |
| --------------- | -------- | ----------------------------------------------- |
| URL             | Required | Required (template: `{url}/control/{endpoint}`) |
| Username        | Required | Via proxy auth                                  |
| Password        | Required | Via proxy auth                                  |
| Default polling | 15s      | Not specified in widget.js                      |

### What Labitat Does Better

- **More stats**: 6 stats vs 4 -- includes parental control, safe search, block rate %, and measured latency
- **Block rate calculation**: Computes and displays the blocking percentage explicitly
- **Client-side latency measurement**: Measures actual API response time rather than relying on server-reported processing time
- **TypeScript**: Fully typed data flow
- **Simpler architecture**: No proxy layer needed

### What Homepage Does Better

- **Filtered aggregate**: Shows combined count of safebrowsing + safesearch + parental blocks as a single "filtered" stat
- **i18n**: Full internationalization support
- **Loading skeletons**: Explicit placeholder blocks during data fetch
- **Latency highlighting**: Uses `highlightValue` to visually emphasize high latency values

### Recommendations (Priority)

1. **[LOW] Add filtered aggregate stat**: Show combined safebrowsing + safesearch + parental count as "Filtered" alongside individual breakdowns
2. **[LOW] Add latency highlighting**: Visually emphasize high latency values in the UI
3. **[LOW] Add i18n support**: Use translation keys instead of hardcoded English labels

---

## 4. Uptime Kuma

### Files Compared

- **Labitat:** `/Users/martin/Developer/labitat/src/lib/adapters/uptime-kuma.tsx`
- **Homepage:** `/Users/martin/Developer/labitat/homepage/src/widgets/uptimekuma/widget.js` + `component.jsx`

### Endpoints

| Aspect      | Labitat                                  | Homepage                          |
| ----------- | ---------------------------------------- | --------------------------------- |
| Status page | `/api/status-page?slug={slug}`           | Same (via mapping: `status_page`) |
| Heartbeat   | `/api/status-page/heartbeat?slug={slug}` | Same (via mapping: `heartbeat`)   |
| Auth        | None (public status page API)            | None                              |

### Data & Stats

| Aspect                | Labitat                           | Homepage                                                  |
| --------------------- | --------------------------------- | --------------------------------------------------------- |
| Sites up              | Yes (counted from heartbeat list) | Yes                                                       |
| Sites down            | Yes (counted from heartbeat list) | Yes                                                       |
| Average uptime %      | Yes (calculated from uptimeList)  | Yes (same calculation)                                    |
| Incident tracking     | **No**                            | **Yes** -- shows current incident with time since created |
| Uptime highlighting   | No                                | Yes (`highlightValue` on uptime block)                    |
| Total stats displayed | 3                                 | 4 (includes incident)                                     |

### Error Handling

| Aspect        | Labitat                                    | Homepage                                                            |
| ------------- | ------------------------------------------ | ------------------------------------------------------------------- |
| API errors    | Generic "Failed to fetch Uptime Kuma data" | Separate error handling for status and heartbeat, shows first error |
| Loading state | Implicit                                   | Explicit skeleton with placeholder blocks                           |

### Configuration

| Aspect           | Labitat                         | Homepage                                           |
| ---------------- | ------------------------------- | -------------------------------------------------- |
| URL              | Required                        | Required (template: `{url}/api/{endpoint}/{slug}`) |
| Status page slug | Optional, defaults to "default" | Same (via `{slug}` template variable)              |
| Default polling  | 15s                             | Not specified                                      |

### What Labitat Does Better

- **TypeScript**: Fully typed data flow
- **Simpler architecture**: No proxy layer needed
- **Same core logic**: The heartbeat counting and uptime calculation logic is identical (both adapted from Homer)

### What Homepage Does Better

- **Incident tracking**: Shows current incident status with time-since-created display (e.g., "2h" since incident)
- **Better error handling**: Separate error states for status and heartbeat endpoints, shows the first error
- **Uptime highlighting**: Uses `highlightValue` to visually emphasize uptime percentage
- **i18n**: Full internationalization support
- **Loading skeletons**: Explicit placeholder blocks during data fetch

### Recommendations (Priority)

1. **[HIGH] Add incident tracking**: Fetch and display current incident status from `statusData.incident` with time-since-created
2. **[MEDIUM] Improve error messages**: Separate error handling for status vs heartbeat endpoints with specific messages
3. **[LOW] Add uptime highlighting**: Visually emphasize the uptime percentage in the UI
4. **[LOW] Add i18n support**: Use translation keys instead of hardcoded English labels

---

## 5. Grafana

### Files Compared

- **Labitat:** `/Users/martin/Developer/labitat/src/lib/adapters/grafana.tsx`
- **Homepage:** `/Users/martin/Developer/labitat/homepage/src/widgets/grafana/widget.js` + `component.jsx`

### Endpoints

| Aspect      | Labitat                | Homepage                                                                                                  |
| ----------- | ---------------------- | --------------------------------------------------------------------------------------------------------- |
| Stats       | `/api/admin/stats`     | Same (via mapping: `stats`, validates `dashboards` field)                                                 |
| Alerts (v1) | `/api/alerts`          | `/api/alerts` (primary) + `/api/alertmanager/grafana/api/v2/alerts` (fallback)                            |
| Alerts (v2) | Not supported          | Configurable: `/api/alertmanager/alertmanager/api/v2/alerts` or `/api/alertmanager/grafana/api/v2/alerts` |
| Auth        | Bearer token (API key) | Via generic proxy handler                                                                                 |

### Data & Stats

| Aspect                | Labitat                                  | Homepage                                                                      |
| --------------------- | ---------------------------------------- | ----------------------------------------------------------------------------- |
| Dashboards count      | Yes (`statsData.dashboards`)             | Yes                                                                           |
| Datasources count     | Yes (`statsData.datasources`)            | Yes                                                                           |
| Total alerts          | Yes (`statsData.alerts`)                 | Yes                                                                           |
| Alerts triggered      | Yes (filtered by `state === "alerting"`) | Yes (same filter for v1, raw count for v2)                                    |
| Alertmanager support  | **No**                                   | **Yes** -- fallback to Grafana alertmanager, and full alertmanager v2 support |
| Total stats displayed | 4                                        | 4                                                                             |

### Error Handling

| Aspect                  | Labitat                                          | Homepage                                                                 |
| ----------------------- | ------------------------------------------------ | ------------------------------------------------------------------------ |
| 401 errors              | Specific "Invalid API key" message               | Generic proxy error                                                      |
| 404 errors              | Specific "Grafana not found at this URL" message | Generic proxy error                                                      |
| Other errors            | `Grafana error: {status}`                        | Generic proxy error                                                      |
| Alerts endpoint failure | Graceful fallback (alertsData defaults to `[]`)  | Sophisticated fallback: tries secondary alerts endpoint if primary fails |
| Loading state           | Implicit                                         | Explicit skeleton with placeholder blocks                                |

### Configuration

| Aspect          | Labitat                                                                  | Homepage                                                    |
| --------------- | ------------------------------------------------------------------------ | ----------------------------------------------------------- |
| URL             | Required, with helper text                                               | Required (template: `{url}/api/{endpoint}`)                 |
| API key         | Required, with helper text ("Found in Configuration > Service Accounts") | Via proxy `key` field                                       |
| Version         | Not supported                                                            | `version` field (1 or 2) -- changes alert endpoint behavior |
| Alert source    | Fixed to `/api/alerts`                                                   | Configurable: `alerts`, `alertmanager`, or `grafana`        |
| Default polling | 15s                                                                      | Not specified                                               |

### What Labitat Does Better

- **Better error messages**: Specific messages for 401 ("Invalid API key") and 404 ("Grafana not found")
- **Helper text**: Config field includes guidance on where to find the API key
- **Graceful alerts fallback**: If `/api/alerts` fails, defaults to empty array instead of throwing
- **TypeScript**: Fully typed data flow
- **Simpler architecture**: No proxy layer needed

### What Homepage Does Better

- **Alertmanager support**: Falls back to Grafana alertmanager API if primary alerts endpoint fails
- **Version 2 support**: Full support for Grafana's newer alerting system with configurable alert source
- **Endpoint validation**: Stats mapping validates that `dashboards` field exists in response
- **i18n**: Full internationalization support
- **Loading skeletons**: Explicit placeholder blocks during data fetch

### Recommendations (Priority)

1. **[HIGH] Add Alertmanager fallback**: If `/api/alerts` fails, try `/api/alertmanager/grafana/api/v2/alerts` as fallback
2. **[MEDIUM] Add Grafana v2 alerting support**: Add `version` config field to support the newer alerting system with configurable alert source
3. **[LOW] Add endpoint validation**: Validate that the stats response contains expected fields (e.g., `dashboards`)
4. **[LOW] Add i18n support**: Use translation keys instead of hardcoded English labels

---

## Cross-Cutting Observations

### Architecture Differences

| Aspect         | Labitat                                 | Homepage                              |
| -------------- | --------------------------------------- | ------------------------------------- |
| Language       | TypeScript (React)                      | JavaScript (Next.js)                  |
| Data fetching  | Direct client-to-API (or server action) | Server-side proxy layer               |
| Type safety    | Full TypeScript with typed payloads     | Untyped JavaScript                    |
| i18n           | Not implemented                         | Full `next-i18next` integration       |
| Loading states | Implicit (React suspense)               | Explicit skeleton placeholders        |
| Chart support  | None                                    | Time-series charts in Glances metrics |
| Configuration  | Inline `configFields` array             | YAML config with template variables   |

### What Labitat Does Better Overall

1. **Type safety**: Every adapter is fully typed from fetch to render
2. **Simpler architecture**: No server-side proxy needed -- direct API communication
3. **Better error messages**: Specific, actionable error messages (401, 404, etc.)
4. **Automatic version detection**: Pi-hole adapter auto-detects v5 vs v6
5. **Richer data in some adapters**: AdGuard shows 6 stats vs Homepage's 4
6. **Unified config schema**: Consistent `ServiceDefinition` type across all adapters
7. **Helper text**: Config fields include guidance (e.g., "Found in Configuration > Service Accounts")

### What Homepage Does Better Overall

1. **Glances depth**: 10 metric views with charts vs 1 unified view -- this is the biggest gap
2. **Time-series charts**: Historical data visualization for Glances metrics
3. **Incident tracking**: Uptime Kuma shows current incident status
4. **Alertmanager support**: Grafana has fallback alert endpoints and v2 support
5. **i18n**: Full internationalization across all widgets
6. **Session caching**: Pi-hole v6 session SID caching avoids re-auth on every poll
7. **Customizable fields**: Users can choose which stats to display (Pi-hole)
8. **Loading skeletons**: Better UX during data fetch with placeholder blocks

---

## Prioritized Recommendations Summary

### High Priority

1. **Glances: Add metric view selection** -- Support info, cpu, memory, disk, network, process, gpu, fs, sensors, containers views
2. **Glances: Add time-series charts** -- Historical data visualization for CPU, memory, disk I/O, network
3. **Uptime Kuma: Add incident tracking** -- Show current incident with time-since-created
4. **Grafana: Add Alertmanager fallback** -- Try alertmanager API if primary alerts endpoint fails

### Medium Priority

5. **Glances: Add per-resource detail** -- Disk I/O per disk, network per interface, process list
6. **Glances: Support v3 API** -- Configurable API version
7. **Uptime Kuma: Improve error handling** -- Separate status vs heartbeat errors
8. **Grafana: Add v2 alerting support** -- Configurable alert source for newer Grafana versions
9. **Pi-hole: Add session caching** -- Cache v6 session SID to avoid re-auth every poll

### Low Priority

10. **All adapters: Add i18n** -- Translation keys instead of hardcoded English
11. **All adapters: Add loading skeletons** -- Explicit placeholder blocks during fetch
12. **AdGuard: Add filtered aggregate** -- Combined safebrowsing + safesearch + parental count
13. **AdGuard: Add latency highlighting** -- Visual emphasis on high latency
14. **Uptime Kuma: Add uptime highlighting** -- Visual emphasis on uptime percentage
15. **Grafana: Add endpoint validation** -- Validate stats response contains expected fields
16. **Pi-hole: Add customizable fields** -- Let users choose which stats to display
17. **Glances: Add configurable refresh intervals** -- Different polling rates per metric type
