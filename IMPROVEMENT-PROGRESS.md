# Adapter Improvement Progress Tracker

## Legend

- `[ ]` - Not started
- `[-]` - In progress
- `[x]` - Completed

---

## 🔴 P0 - Critical Fixes (Fix Immediately)

### 1. Emby/Jellyfin Active Streams

- [x] Add active stream list to Jellyfin adapter
- [x] Add active stream list to Emby adapter
- [-] Add media control (play/pause) callbacks (deferred - requires backend API)
- [x] Add transcoding info to ActiveStream objects
- [x] Update Jellyfin tests
- [x] Update Emby tests

### 2. Jellyfin V1/V2 Endpoint Bug

- [x] Removed V1 support, now only supports latest API
- [x] Fixed endpoint routing
- [x] Removed version config field (simplified)
- [x] Update tests for latest API

### 3. Calibre-Web HTML Scraping

- [ ] Replace HTML scraping with `/opds/stats` JSON endpoint
- [ ] Update type definitions
- [ ] Update tests
- [ ] Remove HTML parsing dependencies if no longer needed

### 4. APC UPS TCP Daemon

- [ ] Add TCP connection support (port 3551)
- [ ] Keep HTTP CGI as fallback
- [ ] Add config option for connection type
- [ ] Update tests for both TCP and HTTP

---

## 🟡 P1 - High Priority (Fix This Week)

### 5. Glances Metric Views

- [ ] Add metric view selection config (CPU, memory, disk, network, etc.)
- [ ] Add time-series chart support to main Glances widget
- [ ] Create separate metric components (like Homepage)
- [ ] Update Glances adapter to fetch individual metrics
- [ ] Update tests

### 6. UniFi Network Health

- [ ] Add WAN/LAN/WLAN status endpoints
- [ ] Add gateway uptime calculation
- [ ] Add network health stats to payload
- [ ] Update tests

### 7. NPM Token Caching

- [ ] Implement JWT token caching with pre-expiry refresh
- [ ] Add token refresh logic
- [ ] Update tests

### 8. qBittorrent State Sorting

- [ ] Implement state-priority sort (downloading > stalled > queued > paused)
- [ ] Update tests

### 9. Proxmox CPU/Memory %

- [ ] Add CPU utilization percentage calculation
- [ ] Add memory utilization percentage calculation
- [ ] Update payload to include percentages
- [ ] Update tests

---

## 🟢 P2 - Medium Priority (Fix This Month)

### 10. Tautulli Improvements

- [ ] Add SxxEyy episode formatting
- [ ] Add audio_decision tracking
- [ ] Add user display toggle config
- [ ] Update tests

### 11. Uptime Kuma Incident Tracking

- [ ] Fetch current incidents from API
- [ ] Display incidents with time-since
- [ ] Add incident count to stats
- [ ] Update tests

### 12. Plex Library Caching

- [ ] Implement library count caching (6-hour TTL)
- [ ] Add cache invalidation logic
- [ ] Update tests

### 13. Readarr Have Count Bug

- [ ] Verify API returns `have` field
- [ ] Compute from bookFileCount if needed
- [ ] Update tests

### 14. Proxmox Backup Server

- [ ] Add CPU usage monitoring
- [ ] Add memory usage monitoring
- [ ] Add failed tasks tracking (last 24h)
- [ ] Fetch all datastores (not just first)
- [ ] Update tests

### 15. Frigate Recent Events

- [ ] Fetch recent events from API
- [ ] Display last 5 detection events
- [ ] Include camera, label, confidence, timestamp
- [ ] Update tests

### 16. Seerr Issue Count

- [ ] Add pending/approved issue counts
- [ ] Add completed field support
- [ ] Update tests

---

## 🔵 P3 - Low Priority (Nice to Have)

### 17. Portainer Kubernetes Mode

- [ ] Add K8s display config option
- [ ] Fetch applications, services, namespaces
- [ ] Update payload for K8s mode
- [ ] Update tests

### 18. Grafana Alertmanager Fallback

- [ ] Add `/alertmanager` endpoint support
- [ ] Update tests

### 19. Immich Binary Units

- [ ] Change from GB/MB to GiB/MiB
- [ ] Update tests

### 20. Home Assistant Template Queries

- [ ] Add template-based state queries
- [ ] Update config to support templates
- [ ] Update tests

### 21. Jackett Error Details

- [ ] Show names of errored indexers
- [ ] Update tests

### 22. Download Adapters showDownloads Toggle

- [ ] Add showDownloads config to qBittorrent
- [ ] Add showDownloads config to Transmission
- [ ] Add showDownloads config to SABnzbd
- [ ] Update tests

### 23. Shared Utility Functions

- [ ] Extract formatBytes to shared utils (1024-based)
- [ ] Extract formatTime to shared utils
- [ ] Replace duplicate implementations across adapters
- [ ] Update all adapters to use shared utils

---

## Progress Summary

| Priority      | Total Items | Completed | In Progress | Remaining | % Complete |
| ------------- | ----------- | --------- | ----------- | --------- | ---------- |
| P0 - Critical | 20          | 0         | 0           | 20        | 0%         |
| P1 - High     | 13          | 0         | 0           | 13        | 0%         |
| P2 - Medium   | 19          | 0         | 0           | 19        | 0%         |
| P3 - Low      | 13          | 0         | 0           | 13        | 0%         |
| **TOTAL**     | **65**      | **0**     | **0**       | **65**    | **0%**     |

---

## Session Notes

### Session 1: [Date]

- Started comparison of all 45 adapters
- Created detailed comparison documents
- Identified 65 improvement items across 4 priority levels

### Session 2: [Date]

- [To be filled as work progresses]

---

## Completed Items Log

### [Date] - Item Description

- What was changed
- Files modified
- Tests updated
