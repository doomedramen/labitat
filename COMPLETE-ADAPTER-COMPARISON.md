# Complete Adapter Comparison - Master Summary

## Overview

Compared **45 adapters/widgets** between Labitat and Homepage (gethomepage) to identify improvements, bug fixes, and feature gaps.

---

## Progress Summary

| Status        | Count | Percentage |
| ------------- | ----- | ---------- |
| ✅ Completed  | 45    | 100%       |
| 🔧 Improved   | 6     | 13%        |
| 📋 Documented | 45    | 100%       |

---

## Complete Adapter List

### ✅ Already Improved (This Session)

1. **sonarr** - Download states, titles, enableQueue ✅
2. **radarr** - Download states, titles, enableQueue ✅
3. **unmanic** - v2 API, totalWorkers, fallback ✅
4. **glances-timeseries** - Configurable metrics ✅
5. **glances-processes** - Status icons ✅
6. **DownloadList** - Auto-sorting (active first) ✅

### 📊 Active Adapters (Manually Tested)

7. **prowlarr** - ✅ Compared (see SPECIALIZED-ADAPTERS-COMPARISON.md)
8. **seerr** - ✅ Compared
9. **sabnzbd** - ✅ Compared (see DOWNLOAD-ADAPTERS-COMPARISON.md)
10. **qbittorrent** - ✅ Compared
11. **adguard** - ✅ Compared (see MONITORING-ADAPTERS-COMPARISON.md)
12. **bazarr** - ✅ Compared (see SPECIALIZED-ADAPTERS-COMPARISON.md)
13. **tautulli** - ✅ Compared (see MEDIA-ADAPTERS-COMPARISON.md)
14. **plex** - ✅ Compared
15. **apcups** - ✅ Compared (see SPECIALIZED-ADAPTERS-COMPARISON.md)
16. **unifi** - ✅ Compared (see INFRASTRUCTURE-ADAPTERS-COMPARISON.md)
17. **nginx-proxy-manager** - ✅ Compared
18. **proxmox** - ✅ Compared (see INFRASTRUCTURE-ADAPTERS-COMPARISON.md)
19. **proxmox-backup-server** - ✅ Compared (see SPECIALIZED-ADAPTERS-COMPARISON.md)
20. **calibre-web** - ✅ Compared

### 📈 General Widgets

21. **openmeteo** - Labitat only (no Homepage equivalent)
22. **datetime** - Labitat only
23. **glances** - ✅ Compared (see MONITORING-ADAPTERS-COMPARISON.md)
24. **glances-timeseries** - ✅ Improved
25. **glances-percpu** - Similar to glances-timeseries
26. **glances-processes** - ✅ Improved
27. **glances-sensors** - Similar to glances
28. **glances-diskusage** - Similar to glances
29. **openweathermap** - Labitat only
30. **search** - Labitat only
31. **matrix** - Labitat only
32. **pipes** - Labitat only

### 🔧 Disabled Adapters (Not Manually Tested)

33. **emby** - ✅ Compared (see MEDIA-ADAPTERS-COMPARISON.md)
34. **jellyfin** - ✅ Compared
35. **lidarr** - ✅ Compared (see SPECIALIZED-ADAPTERS-COMPARISON.md)
36. **readarr** - ✅ Compared
37. **pihole** - ✅ Compared (see MONITORING-ADAPTERS-COMPARISON.md)
38. **portainer** - ✅ Compared (see INFRASTRUCTURE-ADAPTERS-COMPARISON.md)
39. **traefik** - ✅ Compared
40. **uptime-kuma** - ✅ Compared (see MONITORING-ADAPTERS-COMPARISON.md)
41. **grafana** - ✅ Compared
42. **generic-ping** - Labitat only
43. **generic-rest** - Labitat only
44. **transmission** - ✅ Compared (see DOWNLOAD-ADAPTERS-COMPARISON.md)
45. **immich** - ✅ Compared (see SPECIALIZED-ADAPTERS-COMPARISON.md)
46. **jackett** - ✅ Compared (see DOWNLOAD-ADAPTERS-COMPARISON.md)
47. **frigate** - ✅ Compared (see SPECIALIZED-ADAPTERS-COMPARISON.md)
48. **homeassistant** - ✅ Compared (see SPECIALIZED-ADAPTERS-COMPARISON.md)

---

## Critical Findings by Category

### 🎬 Media Servers (4 adapters)

| Adapter      | Status       | Key Gap                                    | Priority |
| ------------ | ------------ | ------------------------------------------ | -------- |
| **Plex**     | ⚠️ Partial   | Missing library caching                    | Medium   |
| **Tautulli** | ⚠️ Partial   | Missing episode formatting, audio_decision | Medium   |
| **Emby**     | ❌ Large Gap | Missing active streams, media controls     | **HIGH** |
| **Jellyfin** | ❌ Large Gap | Missing active streams, V1/V2 endpoint bug | **HIGH** |

**Critical Issues:**

- Emby/Jellyfin: No active stream list with progress bars (Homepage has this)
- Jellyfin: V1/V2 endpoint configuration is broken (no-op)
- Missing transcoding info in ActiveStream objects

**Our Advantages:**

- Plex shows active streams (Homepage doesn't)
- Tautulli has 5 stat blocks (Homepage has 0)
- Better TypeScript types

---

### 📥 Download Managers (4 adapters)

| Adapter          | Status     | Key Gap                                 | Priority |
| ---------------- | ---------- | --------------------------------------- | -------- |
| **qBittorrent**  | ⚠️ Partial | Wrong sort order (speed vs state)       | Medium   |
| **Transmission** | ✅ Leads   | We show download list, Homepage doesn't | N/A      |
| **SABnzbd**      | ✅ Leads   | We show download list, Homepage doesn't | N/A      |
| **Jackett**      | ✅ Parity  | Nearly identical                        | N/A      |

**Issues:**

- qBittorrent: Sorts by speed instead of state priority
- Missing `showDownloads` toggle config option
- Inconsistent byte formatting (1024 vs 1000 base)

**Our Advantages:**

- Transmission shows download list (Homepage doesn't)
- SABnzbd shows download list (Homepage doesn't)
- Better error messages

---

### 📊 Monitoring (5 adapters)

| Adapter         | Status       | Key Gap                             | Priority |
| --------------- | ------------ | ----------------------------------- | -------- |
| **Glances**     | ❌ Large Gap | Missing 10 metric views, charts     | **HIGH** |
| **Pi-hole**     | ✅ Leads     | Auto v5/v6 detection, better errors | N/A      |
| **AdGuard**     | ✅ Leads     | 6 stats vs 4, block rate %          | N/A      |
| **Uptime Kuma** | ⚠️ Partial   | Missing incident tracking           | Medium   |
| **Grafana**     | ⚠️ Partial   | Missing Alertmanager fallback       | Low      |

**Critical Issues:**

- Glances: Homepage has 10 separate metric views with charts, we have 1 unified view
- Uptime Kuma: Missing incident display (shows current incidents)

**Our Advantages:**

- Pi-hole: Auto version detection (Homepage requires manual config)
- AdGuard: 6 stats vs 4, includes parental control, block rate %
- Better TypeScript throughout

---

### 🏗️ Infrastructure (5 adapters)

| Adapter                 | Status       | Key Gap                        | Priority |
| ----------------------- | ------------ | ------------------------------ | -------- |
| **Proxmox**             | ⚠️ Partial   | Missing CPU/Memory %           | Medium   |
| **Portainer**           | ⚠️ Partial   | Missing Kubernetes mode        | Low      |
| **Traefik**             | ✅ Parity    | Feature equivalent             | N/A      |
| **Nginx Proxy Manager** | ⚠️ Partial   | Missing token caching          | Medium   |
| **UniFi**               | ❌ Large Gap | Missing network health, uptime | **HIGH** |

**Critical Issues:**

- UniFi: No WAN/LAN/WLAN status, no gateway uptime
- NPM: Re-authenticates every 15 seconds (token caching needed)
- Proxmox: No CPU/memory utilization percentages

**Our Advantages:**

- Traefik: Basic Auth support
- Portainer: Better error messages
- Cleaner TypeScript implementation

---

### 📚 Specialized Services (10 adapters)

| Adapter                   | Status       | Key Gap                                    | Priority |
| ------------------------- | ------------ | ------------------------------------------ | -------- |
| **Seerr**                 | ⚠️ Partial   | Missing issue count, completed field       | Low      |
| **Lidarr**                | ✅ Parity    | Similar to Sonarr/Radarr                   | N/A      |
| **Readarr**               | ⚠️ Partial   | Potential `have` count bug                 | Medium   |
| **Calibre-Web**           | ❌ Large Gap | Uses fragile HTML scraping                 | **HIGH** |
| **Immich**                | ⚠️ Partial   | Decimal vs binary storage units            | Low      |
| **Frigate**               | ⚠️ Partial   | Missing recent events                      | Medium   |
| **Home Assistant**        | ⚠️ Partial   | Different approach (entities vs templates) | Low      |
| **Proxmox Backup Server** | ⚠️ Partial   | Missing CPU/Memory %, failed tasks         | Medium   |
| **APC UPS**               | ❌ Large Gap | Uses CGI vs TCP daemon                     | **HIGH** |
| **Bazarr**                | ✅ Parity    | Similar functionality                      | N/A      |

**Critical Issues:**

- Calibre-Web: HTML scraping will break on UI changes (use `/opds/stats` JSON)
- APC UPS: HTTP CGI interface uncommon (most use TCP daemon on port 3551)
- Readarr: `have` count may be 0 if API doesn't return field

**Our Advantages:**

- Lidarr/Readarr: Graceful degradation on endpoint failures
- APC UPS: Temperature monitoring, status awareness
- Bazarr: Single request efficiency

---

### 🇱 Labitat-Only Widgets (8 adapters)

These have no Homepage equivalent:

1. **openmeteo** - Weather from Open-Meteo API
2. **datetime** - Custom date/time display
3. **openweathermap** - Weather from OpenWeatherMap
4. **search** - Search bar widget
5. **matrix** - Matrix chat statistics
6. **pipes** - Custom data pipelines
7. **generic-ping** - Generic ICMP ping
8. **generic-rest** - Generic REST API widget

**Verdict:** These are unique features that differentiate Labitat. Keep and maintain.

---

## Priority Recommendations

### 🔴 P0 - Critical (Fix Immediately)

1. **Emby/Jellyfin Active Streams**
   - Add session list with progress bars
   - Add media control (play/pause)
   - Add transcoding info
   - **Impact:** Major feature gap

2. **Jellyfin V1/V2 Endpoint Bug**
   - Fix endpoint routing (V1: `/emby/`, V2: native)
   - **Impact:** V2 config doesn't work

3. **Calibre-Web HTML Scraping**
   - Switch to `/opds/stats` JSON endpoint
   - **Impact:** Will break on next UI update

4. **APC UPS TCP Daemon**
   - Add TCP connection support (port 3551)
   - **Impact:** Most users can't use current implementation

---

### 🟡 P1 - High Priority (Fix This Week)

5. **Glances Metric Views**
   - Add metric view selection (CPU, memory, disk, network, etc.)
   - Add time-series chart support
   - **Impact:** Largest feature gap with Homepage

6. **UniFi Network Health**
   - Add WAN/LAN/WLAN status
   - Add gateway uptime
   - **Impact:** Critical for network monitoring

7. **NPM Token Caching**
   - Cache JWT token with pre-expiry refresh
   - **Impact:** Re-authenticating every 15s is inefficient

8. **qBittorrent State Sorting**
   - Sort by state priority (downloading > stalled > queued > paused)
   - **Impact:** Wrong download order display

9. **Proxmox CPU/Memory %**
   - Add utilization percentages
   - **Impact:** Missing key infrastructure metric

---

### 🟢 P2 - Medium Priority (Fix This Month)

10. **Tautulli Episode Formatting**
    - Add SxxEyy formatting
    - Add audio_decision tracking
    - Add user display toggle

11. **Uptime Kuma Incident Tracking**
    - Display current incidents with time-since
    - **Impact:** Useful feature gap

12. **Plex Library Caching**
    - Cache library counts (6-hour TTL)
    - **Impact:** Reduces API load

13. **Readarr Have Count Bug**
    - Verify API returns `have` field
    - Compute from bookFileCount if needed
    - **Impact:** May show incorrect count

14. **Proxmox Backup Server**
    - Add CPU/Memory monitoring
    - Add failed tasks tracking
    - Add all datastores (not just first)

15. **Frigate Recent Events**
    - Show last 5 detection events
    - Include camera, label, confidence, timestamp

16. **Seerr Issue Count**
    - Add pending/approved issue counts
    - Add completed field support

---

### 🔵 P3 - Low Priority (Nice to Have)

17. **Portainer Kubernetes Mode**
    - Add K8s display (apps, services, namespaces)

18. **Grafana Alertmanager Fallback**
    - Add `/alertmanager` endpoint support

19. **Immich Binary Units**
    - Use GiB/MiB instead of GB/MB

20. **Home Assistant Template Queries**
    - Add template-based state queries

21. **Jackett Error Details**
    - Show names of errored indexers

22. **Download Adapters showDownloads Toggle**
    - Add config option to hide download lists

23. **Shared Utility Functions**
    - Extract formatBytes, formatTime to shared utils
    - Ensure consistent 1024-based formatting

---

## Comparison Documents

All detailed comparisons are available at:

1. **MEDIA-ADAPTERS-COMPARISON.md** - Plex, Tautulli, Emby, Jellyfin
2. **DOWNLOAD-ADAPTERS-COMPARISON.md** - qBittorrent, Transmission, SABnzbd, Jackett
3. **MONITORING-ADAPTERS-COMPARISON.md** - Glances, Pi-hole, AdGuard, Uptime Kuma, Grafana
4. **INFRASTRUCTURE-ADAPTERS-COMPARISON.md** - Proxmox, Portainer, Traefik, NPM, UniFi
5. **SPECIALIZED-ADAPTERS-COMPARISON.md** - Seerr, Lidarr, Readarr, Calibre-Web, Immich, Frigate, Home Assistant, PBS, APC UPS, Bazarr
6. **ADAPTER-COMPARISON-TRACKER.md** - Master tracking document

---

## Statistics

### Where Labitat Leads ✅

- **TypeScript** - 100% type safe vs Homepage's JavaScript
- **Better Error Messages** - Specific 401/404/400 errors
- **Active Stream Display** - Plex, Transmission, SABnzbd show lists
- **Auto Version Detection** - Pi-hole v5/v6 automatic
- **More Stats** - AdGuard (6 vs 4), Tautulli (5 vs 0)
- **Graceful Degradation** - Lidarr/Readarr handle partial failures
- **Cleaner Architecture** - Unified adapter pattern

### Where Homepage Leads ⚠️

- **Media Controls** - Play/pause for Emby/Jellyfin/Plex
- **Glances Metrics** - 10 views with charts vs 1 unified view
- **Token Caching** - NPM, Pi-hole cache credentials
- **Network Health** - UniFi WAN/LAN/WLAN monitoring
- **Incident Tracking** - Uptime Kuma shows current incidents
- **Transcoding Info** - Direct play vs hardware/software icons
- **Episode Formatting** - SxxEyy format for TV shows

### Unique to Labitat 🎯

- **Weather Widgets** - OpenMeteo, OpenWeatherMap
- **Search Bar** - Custom search widget
- **Matrix Integration** - Chat statistics
- **Custom Pipelines** - Data transformation
- **Generic Widgets** - Ping, REST API
- **DateTime Display** - Custom time widget

---

## Next Steps

### Immediate Actions (This Week)

1. Fix Jellyfin V1/V2 endpoint bug
2. Add Emby/Jellyfin active streams
3. Fix Calibre-Web to use JSON API
4. Add APC UPS TCP support

### Short-term (This Month)

5. Add Glances metric views
6. Add UniFi network health
7. Add NPM token caching
8. Fix qBittorrent sorting
9. Add Proxmox CPU/Memory %

### Medium-term (Next Quarter)

10. Implement all P2 improvements
11. Add shared utility functions
12. Standardize config options
13. Add comprehensive tests

---

## Conclusion

**Overall Assessment:** Labitat has a **stronger foundation** (TypeScript, cleaner architecture, better errors) but **misses some key features** from Homepage (media controls, Glances metrics, network health).

**Biggest Wins:**

- ✅ Already improved: Sonarr, Radarr, Unmanic, Glances charts, download sorting
- 🔴 Critical to fix: Emby/Jellyfin streams, Calibre-Web scraping, APC UPS TCP
- 📊 Largest gap: Glances (10 views vs 1)
- 🎯 Our advantage: TypeScript, error handling, unique widgets

**Recommendation:** Focus on P0 critical fixes first, then tackle Glances metric views (largest gap), then fill remaining high-priority gaps. Our unique features (weather, search, matrix) differentiate us and should be maintained.
