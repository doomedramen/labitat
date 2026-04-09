# Infrastructure Adapters Comparison: Labitat vs Homepage

**Date:** 2026-04-09
**Scope:** 5 infrastructure adapters compared between our implementation and Homepage (gethomepage/homepage).

---

## Summary Table

| Adapter       | Our Stats                                  | Homepage Stats                     | Feature Parity | Our Advantages                              | Homepage Advantages                            |
| ------------- | ------------------------------------------ | ---------------------------------- | -------------- | ------------------------------------------- | ---------------------------------------------- |
| **Proxmox**   | 3 (Nodes, VMs, LXCs)                       | 4 (VMs, LXCs, CPU%, Mem%)          | Partial        | Cleaner auth flow, typed data               | CPU/Memory %, node filtering                   |
| **Portainer** | 3 (Running, Stopped, Total)                | 3-6 (Docker or K8s mode)           | Partial        | Simpler, explicit endpointId config         | Kubernetes support, configurable fields        |
| **Traefik**   | 3 (Routers, Services, Middlewares)         | 3 (Routers, Services, Middlewares) | Full           | Better error messages, optional auth        | Simpler widget config                          |
| **NPM**       | 4 (Proxy, Redirections, Streams, Disabled) | 3 (Enabled, Disabled, Total)       | Partial        | More granular stats (streams, redirections) | Token caching with retry                       |
| **UniFi**     | 4 (Users, Guests, Devices, Sites)          | 4-7 (Uptime, WAN, LAN, WLAN stats) | Partial        | Simpler, broader device count               | Health monitoring, multi-site, UDM Pro support |

---

## 1. Proxmox

### Our Implementation

**File:** `/Users/martin/Developer/labitat/src/lib/adapters/proxmox.tsx`

**Endpoints:**

- `POST /api2/json/access/ticket` -- Login (cookie-based auth)
- `GET /api2/json/cluster/resources` -- Cluster resource listing

**Stats exposed:**

- Nodes (total count)
- VMs (running/total)
- LXCs (running/total)

**Config fields:** `url`, `username`, `password`

**Error handling:** Basic -- throws on non-OK response with status code.

### Homepage Implementation

**Files:** `/Users/martin/Developer/labitat/homepage/src/widgets/proxmox/widget.js`, `component.jsx`

**Endpoints:**

- `GET /api2/json/cluster/resources` -- via credentialed proxy handler (handles auth transparently)

**Stats exposed:**

- VMs (running/total)
- LXCs (running/total)
- CPU usage (percentage, with highlight)
- Memory usage (percentage, with highlight)

**Config fields:** `url`, `username`, `password`, plus optional `node` filter

**Error handling:** Error boundary in component, loading states with empty blocks.

### Comparison

| Aspect             | Labitat                      | Homepage                              | Winner                        |
| ------------------ | ---------------------------- | ------------------------------------- | ----------------------------- |
| Authentication     | Direct POST login in adapter | Delegated to credentialedProxyHandler | Homepage (cleaner separation) |
| Node count         | Yes                          | No                                    | Labitat                       |
| CPU %              | No                           | Yes                                   | Homepage                      |
| Memory %           | No                           | Yes                                   | Homepage                      |
| Node filtering     | No                           | Yes (`widget.node`)                   | Homepage                      |
| Template filtering | No                           | Yes (excludes templates)              | Homepage                      |
| Code structure     | Self-contained, typed        | Split widget/component                | Labitat (simpler)             |
| Type safety        | TypeScript                   | JavaScript                            | Labitat                       |

### Advantages / Disadvantages

**Our advantages:**

- Self-contained adapter (no proxy infrastructure needed)
- TypeScript type safety throughout
- Explicit node count stat
- Cleaner, more readable code

**Homepage advantages:**

- CPU and memory percentage utilization stats (valuable for dashboards)
- Node-level filtering (useful in multi-node clusters)
- Template exclusion (templates are not running VMs)
- Highlight value for CPU/Memory (visual emphasis on utilization)

### Recommendations

1. **Add CPU/Memory % stats** -- This is the most significant gap. Homepage aggregates `maxcpu`, `cpu`, `maxmem`, `mem` from node resources to compute utilization percentages.
2. **Add optional `node` filter** -- Allow users to scope to a specific node in multi-node clusters.
3. **Exclude templates** -- Filter out `template === 1` entries from VM/LXC counts.

---

## 2. Portainer

### Our Implementation

**File:** `/Users/martin/Developer/labitat/src/lib/adapters/portainer.tsx`

**Endpoints:**

- `POST /api/auth` -- JWT authentication
- `GET /api/endpoints/{endpointId}/docker/containers/json?all=1` -- Container listing

**Stats exposed:**

- Running containers
- Stopped containers
- Total containers

**Config fields:** `url`, `username`, `password`, `endpointId` (optional, default: 1)

**Error handling:** Specific error messages for 400 (invalid creds), 404 (not found), and generic errors.

### Homepage Implementation

**Files:** `/Users/martin/Developer/labitat/homepage/src/widgets/portainer/widget.js`, `component.jsx`

**Endpoints:**

- `GET /api/endpoints/{env}/docker/containers/json?all=1` -- Docker containers
- `GET /api/kubernetes/{env}/applications/count` -- K8s applications
- `GET /api/kubernetes/{env}/services/count` -- K8s services
- `GET /api/kubernetes/{env}/namespaces/count` -- K8s namespaces

**Stats exposed (Docker mode):**

- Running containers
- Stopped containers
- Total containers

**Stats exposed (Kubernetes mode):**

- Applications
- Services
- Namespaces

**Config fields:** `url`, `username`, `password`, `env` (environment ID), `kubernetes` (boolean flag), `fields` (optional override)

**Error handling:** Error boundary, loading states, handles error objects in data.

### Comparison

| Aspect              | Labitat            | Homepage               | Winner   |
| ------------------- | ------------------ | ---------------------- | -------- |
| Docker containers   | Yes                | Yes                    | Tie      |
| Kubernetes support  | No                 | Yes                    | Homepage |
| Configurable fields | No                 | Yes (`widget.fields`)  | Homepage |
| Error specificity   | Detailed (400/404) | Generic                | Labitat  |
| Number formatting   | `toLocaleString()` | Raw numbers            | Labitat  |
| Code structure      | Single file        | Split widget/component | Labitat  |
| Type safety         | TypeScript         | JavaScript             | Labitat  |

### Advantages / Disadvantages

**Our advantages:**

- More specific error messages (distinguishes bad creds vs wrong URL)
- Number formatting with `toLocaleString()`
- Single-file, self-contained adapter
- TypeScript type safety

**Homepage advantages:**

- **Kubernetes support** -- Major feature gap. Can show K8s applications, services, and namespaces.
- Configurable display fields -- Users can choose which stats to show.
- Graceful error object handling (containersCount can be an error object).

### Recommendations

1. **Consider Kubernetes support** -- If users have Portainer managing K8s clusters, adding the three K8s endpoints would be valuable.
2. **Add configurable fields** -- Allow users to choose which stats to display.
3. **Current implementation is solid** for Docker-only use cases -- error handling is actually better than Homepage's.

---

## 3. Traefik

### Our Implementation

**File:** `/Users/martin/Developer/labitat/src/lib/adapters/traefik.tsx`

**Endpoints:**

- `GET /api/overview` -- Traefik overview (routers, services, middlewares totals)

**Stats exposed:**

- Routers (total)
- Services (total)
- Middlewares (total)

**Config fields:** `url`, `username` (optional), `password` (optional)

**Error handling:** Specific errors for 401 (invalid creds), 404 (not found), and generic errors.

### Homepage Implementation

**Files:** `/Users/martin/Developer/labitat/homepage/src/widgets/traefik/widget.js`, `component.jsx`

**Endpoints:**

- `GET /api/overview` -- via generic proxy handler (no auth delegation needed)

**Stats exposed:**

- Routers (total)
- Services (total)
- Middlewares (total)

**Config fields:** `url` (auth handled by Homepage's generic proxy)

**Error handling:** Error boundary, loading states with empty blocks.

### Comparison

| Aspect          | Labitat                        | Homepage                        | Winner                              |
| --------------- | ------------------------------ | ------------------------------- | ----------------------------------- |
| Endpoints       | `/api/overview`                | `/api/overview`                 | Tie                                 |
| Stats           | Routers, Services, Middlewares | Routers, Services, Middlewares  | Tie                                 |
| Auth support    | Optional Basic Auth            | Generic proxy (no special auth) | Labitat (more flexible)             |
| Error handling  | Specific (401/404)             | Generic                         | Labitat                             |
| Data validation | `validate: ["http"]` in widget | None                            | Homepage (validates response shape) |
| Code structure  | Single file                    | Split widget/component          | Labitat                             |
| Type safety     | TypeScript                     | JavaScript                      | Labitat                             |

### Advantages / Disadvantages

**Our advantages:**

- Optional Basic Auth support (many Traefik dashboards are behind auth)
- More specific error messages
- Self-contained, single-file adapter
- TypeScript type safety

**Homepage advantages:**

- Response validation (`validate: ["http"]` ensures the overview has HTTP data)
- Slightly simpler (no auth logic needed in most setups)

### Recommendations

1. **This is the closest to feature parity** -- Both implementations are functionally equivalent.
2. **Consider adding response validation** -- Homepage validates that `http` key exists in the response. We could add a similar check.
3. **Consider TCP stats** -- Homepage only shows HTTP stats; Traefik also has TCP routers/services. Could optionally expose those.

---

## 4. Nginx Proxy Manager (NPM)

### Our Implementation

**File:** `/Users/martin/Developer/labitat/src/lib/adapters/nginx-proxy-manager.tsx`

**Endpoints:**

- `POST /api/tokens` -- Token-based authentication
- `GET /api/nginx/proxy-hosts` -- Proxy host listing
- `GET /api/nginx/redirection-hosts` -- Redirection host listing
- `GET /api/nginx/streams` -- Stream listing
- `GET /api/nginx/dead-hosts` -- Disabled host listing

**Stats exposed:**

- Proxy Hosts (count)
- Redirections (count)
- Streams (count)
- Disabled (count)

**Config fields:** `url`, `email`, `password`

**Error handling:** Throws on login failure; gracefully handles non-OK responses for individual endpoints (returns 0). Uses `Promise.all` for parallel fetching.

### Homepage Implementation

**Files:** `/Users/martin/Developer/labitat/homepage/src/widgets/npm/widget.js`, `component.jsx`, `proxy.js`

**Endpoints:**

- `POST /api/tokens` -- Token-based auth (with caching)
- `GET /api/nginx/proxy-hosts` -- Proxy host listing (all types combined)

**Stats exposed:**

- Enabled (count of hosts where `enabled === true`)
- Disabled (count of hosts where `enabled === false`)
- Total (count)

**Config fields:** `url`, `username` (email), `password`

**Error handling:** Token caching with 5-minute pre-expiry refresh, automatic retry on 403 (expired token), logging.

### Comparison

| Aspect              | Labitat                                           | Homepage                           | Winner   |
| ------------------- | ------------------------------------------------- | ---------------------------------- | -------- |
| Granularity         | 4 categories (proxy, redirect, streams, disabled) | 2 categories (enabled, disabled)   | Labitat  |
| Token caching       | No (re-authenticates every poll)                  | Yes (memory-cache with pre-expiry) | Homepage |
| Token retry         | No                                                | Yes (auto-retry on 403)            | Homepage |
| Parallel fetching   | Yes (`Promise.all`)                               | No (single endpoint)               | Labitat  |
| Response parsing    | Robust (`parseCount` handles arrays/objects)      | Simple `.filter()`                 | Labitat  |
| Streams support     | Yes                                               | No                                 | Labitat  |
| Redirection support | Yes                                               | No                                 | Labitat  |

### Advantages / Disadvantages

**Our advantages:**

- **Much more granular stats** -- Shows proxy hosts, redirections, streams, and disabled separately vs Homepage's enabled/disabled/total.
- **Streams support** -- Homepage does not track NPM streams at all.
- **Parallel fetching** -- Uses `Promise.all` for all 4 endpoints simultaneously.
- **Robust response parsing** -- `parseCount()` handles arrays, wrapped objects, and total fields.

**Homepage advantages:**

- **Token caching** -- Caches the JWT token and only re-authenticates when near expiry. We re-authenticate on every poll cycle.
- **Automatic retry on 403** -- If token expires mid-request, Homepage re-logs in and retries automatically.
- **Logging** -- Debug logging for troubleshooting.

### Recommendations

1. **Add token caching** -- This is the most important improvement. Currently we re-authenticate on every 15-second poll, which is inefficient and could trigger rate limiting.
2. **Add 403 retry logic** -- If a token expires between polls, retry with a fresh login.
3. **Our stat granularity is superior** -- Homepage's enabled/disabled split is less useful than our proxy/redirection/streams/disabled breakdown. Keep our approach.

---

## 5. UniFi

### Our Implementation

**File:** `/Users/martin/Developer/labitat/src/lib/adapters/unifi.tsx`

**Endpoints:**

- `POST /api/login` -- Cookie-based authentication
- `GET /api/s/default/stat/sta/all` -- All connected stations (clients)
- `GET /api/s/default/rest/device` -- Adopted devices

**Stats exposed:**

- Users (non-guest clients)
- Guests (guest clients)
- Devices (adopted devices count)
- Sites (hardcoded to 1)

**Config fields:** `url`, `username`, `password`

**Error handling:** Basic -- throws on login failure or client fetch error. Device fetch failure is tolerated (defaults to 0).

### Homepage Implementation

**Files:** `/Users/martin/Developer/labitat/homepage/src/widgets/unifi/widget.js`, `component.jsx`, `proxy.js`

**Endpoints:**

- `GET /api/stat/sites` -- Site listing
- Health data from site response (WAN, LAN, WLAN subsystems)

**Stats exposed:**

- Uptime (days, from gateway stats)
- WAN status (up/down)
- LAN users (count)
- LAN devices (count, if no WLAN)
- LAN status (up/down, if no WLAN)
- WLAN users (count)
- WLAN devices (count, if no LAN)
- WLAN status (up/down, if no LAN)

**Config fields:** `url`, `username`, `password`, `site` (optional site name), `key` (optional API key for UDM Pro), `prefix` (auto-detected)

**Error handling:** Multi-site support with site-not-found error, empty data handling, conditional display based on available subsystems.

### Comparison

| Aspect          | Labitat                  | Homepage                          | Winner                   |
| --------------- | ------------------------ | --------------------------------- | ------------------------ |
| Client counts   | Users + Guests           | LAN users + WLAN users            | Homepage (more granular) |
| Device counts   | Total adopted            | LAN devices / WLAN devices        | Homepage (more granular) |
| Network health  | No                       | WAN/LAN/WLAN up/down              | Homepage                 |
| Uptime          | No                       | Gateway uptime                    | Homepage                 |
| Multi-site      | No (hardcoded `default`) | Yes (`widget.site` config)        | Homepage                 |
| UDM Pro support | No                       | Yes (API key + prefix detection)  | Homepage                 |
| Auth method     | Cookie-based             | Complex (cookie + CSRF + API key) | Homepage (more robust)   |
| Code simplicity | Simple                   | Complex                           | Labitat                  |
| Type safety     | TypeScript               | JavaScript                        | Labitat                  |

### Advantages / Disadvantages

**Our advantages:**

- Simpler, easier to understand
- TypeScript type safety
- Tolerates device fetch failure gracefully

**Homepage advantages:**

- **Network health monitoring** -- Shows WAN/LAN/WLAN status (up/down), which is critical for a dashboard.
- **Gateway uptime** -- Shows how long the gateway has been running.
- **Multi-site support** -- Can target specific sites by name.
- **UDM Pro support** -- Handles the UDM Pro's different API path (`/proxy/network`) and API key auth.
- **Conditional display** -- Smart logic to show LAN or WLAN stats based on what's available.
- **Auto prefix detection** -- Detects whether to use `/proxy/network` prefix based on response headers.

### Recommendations

1. **This is the largest feature gap** -- Homepage's UniFi widget is significantly more feature-rich.
2. **Add network health stats** -- Query `/api/s/{site}/stat/health` or use site data to show WAN/LAN/WLAN status.
3. **Add gateway uptime** -- From `gw_system-stats.uptime`.
4. **Add multi-site support** -- Allow configuring a site name instead of hardcoding `default`.
5. **Consider UDM Pro support** -- The prefix detection and API key auth are complex but valuable for UDM Pro users.

---

## Overall Findings

### Where Labitat Excels

1. **TypeScript throughout** -- All adapters are fully typed; Homepage uses JavaScript.
2. **Unified adapter pattern** -- Single `ServiceDefinition` type with `fetchData` + `toPayload`; Homepage splits into widget.js + component.jsx.
3. **Better error messages** -- More specific HTTP status code handling in most adapters.
4. **NPM granularity** -- Our NPM adapter shows 4 categories vs Homepage's 2.
5. **Self-contained** -- No separate proxy infrastructure needed; each adapter handles its own auth.
6. **Number formatting** -- Consistent use of `toLocaleString()` for large numbers.

### Where Homepage Excels

1. **Token caching** -- NPM adapter caches JWT tokens; we re-authenticate every poll.
2. **Resource utilization** -- Proxmox CPU/Memory % stats.
3. **Kubernetes support** -- Portainer K8s mode.
4. **Network health** -- UniFi WAN/LAN/WLAN status and uptime.
5. **Multi-site/multi-node** -- Filtering by node (Proxmox) or site (UniFi).
6. **UDM Pro support** -- Complex but comprehensive UniFi proxy handling.
7. **Configurable display fields** -- Portainer allows choosing which stats to show.

### Architecture Differences

| Aspect           | Labitat                                     | Homepage                                      |
| ---------------- | ------------------------------------------- | --------------------------------------------- |
| Language         | TypeScript                                  | JavaScript                                    |
| Pattern          | Single-file adapter (fetchData + toPayload) | Split widget.js (config) + component.jsx (UI) |
| Auth             | Direct in adapter                           | Delegated to proxy handlers                   |
| Data flow        | Server fetch -> cache -> client SWR         | Server proxy -> client useWidgetAPI           |
| Token management | Per-request                                 | Cached with expiry                            |
| Error handling   | Throw errors                                | Error boundaries + loading states             |

---

## Priority Recommendations

### High Priority

1. **NPM: Add token caching** -- Re-authenticating every 15 seconds is inefficient and risks rate limiting. Implement in-memory token caching with pre-expiry refresh.
2. **Proxmox: Add CPU/Memory %** -- The most requested infrastructure metric. Aggregate from node `maxcpu`/`maxmem`/`cpu`/`mem` fields.
3. **UniFi: Add network health** -- WAN/LAN/WLAN status is critical for a dashboard. Add `/api/s/{site}/stat/health` endpoint.

### Medium Priority

4. **UniFi: Add multi-site support** -- Allow configuring a site name instead of hardcoding `default`.
5. **UniFi: Add gateway uptime** -- From `gw_system-stats.uptime`.
6. **Proxmox: Add node filtering** -- Optional `node` config field to scope to a specific node.
7. **Proxmox: Exclude templates** -- Filter out `template === 1` from VM/LXC counts.

### Low Priority

8. **Portainer: Add Kubernetes support** -- Three additional endpoints for K8s applications/services/namespaces.
9. **Traefik: Add response validation** -- Validate that `http` key exists in overview response.
10. **Portainer: Add configurable fields** -- Allow users to choose which stats to display.
