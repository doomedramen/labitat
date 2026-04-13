---
layout: home

hero:
  name: Labitat
  text: A modern, self-hosted homelab dashboard.
  tagline: Live service widgets, drag-and-drop layout, and full PWA support.
  image:
    src: /logo.svg
    alt: Labitat Logo
  actions:
    - theme: brand
      text: Get Started
      link: /getting-started
    - theme: alt
      text: View Services
      link: /services/
    - theme: alt
      text: GitHub
      link: https://github.com/DoomedRamen/labitat

features:
  - icon: 📊
    title: Live Monitoring
    details: Real-time status and metrics for services including Radarr, Sonarr, Plex, and more. No page refresh needed.
  - icon: 🖱️
    title: Drag & Drop
    details: Arrange widgets your way with an intuitive drag-and-drop layout editor. Save multiple layouts for different views.
  - icon: 📱
    title: PWA Support
    details: Install on desktop or mobile for a native app experience. Fast, responsive, and available offline.
  - icon: 🔒
    title: Secure by Default
    details: AES-256-GCM encryption for credentials, HTTP-only sessions, CSRF protection, and strict security headers.
  - icon: 🪶
    title: Lightweight
    details: Optimized for efficiency. Runs smoothly on a Raspberry Pi while scaling to powerful enterprise servers.
  - icon: 🔌
    title: Extensible
    details: Add your own services with a single TypeScript file. Clean adapter API makes contributions a breeze.
---

## Supported Ecosystem

::: tip
Explore our growing library of over 40+ pre-built service adapters. Each service comes with a dedicated real-time widget.
:::

<div class="service-section">

<div class="service-category">

### 📥 Downloads

- Radarr
- Sonarr
- Lidarr
- Prowlarr
- qBittorrent
- SABnzbd
</div>

<div class="service-category">

### 🎬 Media

- Jellyfin
- Plex
- Emby
- Tautulli
- Immich
- Frigate
</div>

<div class="service-category">

### 🌐 Networking

- Pi-hole
- AdGuard Home
- NPM
- Traefik
- Unifi
</div>

<div class="service-category">

### 📈 Monitoring

- Portainer
- Uptime Kuma
- Grafana
- APCUPS
- Glances
</div>

</div>

---

## Quick Start

Setting up Labitat is as simple as running a single command.

```bash
# Clone and run
git clone https://github.com/DoomedRamen/labitat.git && cd labitat
docker compose up -d
```

Visit `http://localhost:3000` — you'll be guided to create your admin account on first visit.
