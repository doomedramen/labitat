# Labitat

A modern, self-hosted homelab dashboard with live service widgets, drag-and-drop layout, and full PWA support.

## Quick Start

### Docker Compose (Recommended)

```bash
git clone https://github.com/labitat/labitat.git && cd labitat
cp config.yaml.example config.yaml
cp .env.example .env

# Generate SECRET_KEY: openssl rand -base64 32
docker compose up -d
```

Access at `http://localhost:3000`.

### Native Install (Debian/Proxmox)

```bash
bash <(curl -s https://raw.githubusercontent.com/labitat/labitat/main/install.sh)
```

## Supported Services

**Downloads:** Radarr, Sonarr, Lidarr, Prowlarr, qBittorrent, SABnzbd, Bazarr  
**Media:** Jellyfin, Plex, Emby, Unmanic, Tautulli  
**Networking:** Pi-hole, AdGuard Home, Nginx Proxy Manager, Traefik  
**Monitoring:** Portainer, Uptime Kuma, Grafana, APCUPS, Unifi  
**Automation:** Home Assistant  
**Generic:** Ping, REST API

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Yes | 32+ char random string for encryption |
| `DATABASE_URL` | No | SQLite path (default: `file:./data/labitat.db`) |
| `NODE_ENV` | No | Set to `production` for deployment |
| `PORT` | No | Override default port (3000) |

### config.yaml

```yaml
auth:
  email: admin@home.lab
  passwordHash: $2b$12$...  # bcrypt hash of your password
app:
  title: My Homelab
  defaultPollingMs: 10000
```

Generate password hash:
```bash
node -e "require('bcryptjs').hash('yourpassword', 12).then(console.log)"
```

## Development

```bash
pnpm install
pnpm dev          # Development server
pnpm build        # Production build
pnpm db:push      # Push schema changes
pnpm db:studio    # Open database GUI
```

## Adding a New Service

```bash
pnpm new-service
```

Generates a service adapter and widget component. See [PROJECT_SPEC.md](./PROJECT_SPEC.md) for details.

## Security

- AES-256-GCM encryption for credentials
- iron-session with HTTP-only cookies
- Security headers (X-Frame-Options, CSP)
- Non-root Docker user

## PWA Installation

- **Desktop:** Click install icon in browser address bar
- **iOS:** Share → Add to Home Screen
- **Android:** Menu → Install app

## Troubleshooting

```bash
# Check logs
docker compose logs labitat
journalctl -u labitat -f  # systemd

# Reset database (WARNING: deletes all data)
rm ./data/labitat.db && pnpm db:push
```

## License

MIT - see [LICENSE](./LICENSE).

## Contributing

See [Contributing Guide](./CONTRIBUTING.md).

---

Built with [Next.js](https://nextjs.org/) and [shadcn/ui](https://ui.shadcn.com/). Icons from [selfh.st](https://selfh.st/icons).
