# Labitat

[![CI](https://github.com/DoomedRamen/labitat/actions/workflows/ci.yml/badge.svg)](https://github.com/DoomedRamen/labitat/actions/workflows/ci.yml)
[![Latest version](https://img.shields.io/github/v/tag/DoomedRamen/labitat?label=latest)](https://github.com/DoomedRamen/labitat/releases)
[![License: MIT](https://img.shields.io/badge/license-MIT-blue.svg)](LICENSE)
[![Docs](https://img.shields.io/badge/docs-online-blue.svg)](https://doomedramen.github.io/labitat/)

Labitat is a self-hosted homelab dashboard for monitoring services, arranging live widgets, and keeping a useful overview of your setup from desktop or mobile.

## Features

- Live service widgets with server-side polling and cached data
- Drag-and-drop dashboard layouts
- PWA support for desktop and mobile installs
- Encrypted stored credentials with HTTP-only sessions
- Docker, native Debian/Proxmox, and manual install options
- Adapter scaffold for adding new services

## Install

### Docker

```bash
docker run -d \
  --name labitat \
  --restart unless-stopped \
  -p 3000:3000 \
  -v labitat_data:/app/data \
  ghcr.io/doomedramen/labitat:latest
```

Open `http://localhost:3000` and create the admin account on first run.

### Docker Compose

```bash
curl -fsSL https://raw.githubusercontent.com/DoomedRamen/labitat/main/docker-compose.yml -o docker-compose.yml
docker compose up -d
```

### Native Debian/Proxmox

```bash
bash <(curl -s https://raw.githubusercontent.com/DoomedRamen/labitat/main/install.sh)
```

### Manual

Requires Node.js 22+ and pnpm.

```bash
pnpm install
pnpm db:push
pnpm build
pnpm start
```

## Supported Services

- Downloads: Radarr, Sonarr, Prowlarr, qBittorrent, SABnzbd, Bazarr
- Media: Plex, Unmanic, Tautulli, Overseerr/Seerr
- Networking: AdGuard Home, Nginx Proxy Manager
- Monitoring: APCUPS, UniFi, Glances, Proxmox, Proxmox Backup Server
- Productivity: Calibre Web
- Info and utility widgets: Open-Meteo, OpenWeatherMap, Date/Time, Search, Matrix, Pipes, Service Logo

Additional adapters exist for services such as Lidarr, Readarr, Transmission, Jackett, Jellyfin, Emby, Immich, Pi-hole, Traefik, Portainer, Uptime Kuma, Grafana, Frigate, Home Assistant, Ping, and REST APIs.

## Configuration

Docker generates and stores `SECRET_KEY` in `/app/data/.secret_key` on first run. Back up the `labitat_data` volume so encrypted credentials remain readable after restores or migrations.

Common environment variables:

| Variable       | Default                     | Description                       |
| -------------- | --------------------------- | --------------------------------- |
| `SECRET_KEY`   | Auto-generated in Docker    | Key for encrypted service secrets |
| `DATABASE_URL` | `file:./data/labitat.db`    | SQLite database path              |
| `PORT`         | `3000`                      | HTTP port                         |
| `CACHE_DIR`    | `/app/data/cache` in Docker | Widget cache directory            |

## Development

```bash
pnpm install
pnpm dev
pnpm check
pnpm test
```

Create a new service adapter:

```bash
pnpm new-service
```

## Docs

Full documentation is available at [doomedramen.github.io/labitat](https://doomedramen.github.io/labitat/).

## License

MIT. See [LICENSE](LICENSE).
