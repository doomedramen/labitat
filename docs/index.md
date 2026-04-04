---
title: Home
description: A modern, self-hosted homelab dashboard with live service widgets, drag-and-drop layout, and full PWA support.
---

# Labitat

A modern, self-hosted homelab dashboard with live service widgets, drag-and-drop layout, and full PWA support. Monitor your services from a single, beautiful interface.

![Labitat Dashboard](/images/labitat_dash.png)

<div class="cta-group">
  <a href="/getting-started" class="cta-primary">Get Started →</a>
  <a href="/installation" class="cta-secondary">Installation</a>
  <a href="https://github.com/DoomedRamen/labitat" class="cta-secondary">GitHub</a>
</div>

## Features

- **📊 Live Monitoring** — Real-time status and metrics for services including Radarr, Sonarr, Plex, and more.
- **🖱️ Drag & Drop** — Arrange widgets your way with an intuitive drag-and-drop layout editor.

  ![Dashboard Edit Mode](/images/labitat_dash_edit.png)

- **📱 PWA Support** — Install on desktop or mobile for a native app experience with offline support.
- **🔒 Secure by Default** — AES-256-GCM encryption for credentials, HTTP-only sessions, and security headers.
- **🪶 Lightweight** — Runs on a Raspberry Pi, scales to full servers. Minimal resource usage.
- **🔌 Extensible** — Add your own services with a single TypeScript file. One file = one service.

## Supported Services

| Category | Services |
|----------|----------|
| **Downloads** | Radarr, Sonarr, Lidarr, Prowlarr, qBittorrent, SABnzbd, Bazarr |
| **Media** | Jellyfin, Plex, Emby, Unmanic, Tautulli, Immich, Frigate |
| **Networking** | Pi-hole, AdGuard Home, Nginx Proxy Manager, Traefik |
| **Monitoring** | Portainer, Uptime Kuma, Grafana, APCUPS, Unifi |
| **Automation** | Home Assistant |
| **Generic** | Ping, REST API (bring your own endpoint) |

See [all services](/services/) for individual configuration guides.

## Quick Start

```bash
git clone https://github.com/DoomedRamen/labitat.git && cd labitat
cp .env.example .env
docker compose up -d
```

Visit `http://localhost:3000` — you'll be guided to create your admin account on first visit.
