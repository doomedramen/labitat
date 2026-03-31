# Labitat

A modern, self-hosted homelab dashboard with live service widgets, drag-and-drop layout, and full PWA support.

![Labitat Dashboard](https://via.placeholder.com/1200x600.png?text=Labitat+Dashboard)

## Features

- **Live Service Widgets** - Real-time data from 30+ popular homelab services
- **Drag-and-Drop Layout** - Intuitive in-app editing with named groups
- **Modern UI** - Built with shadcn/ui and Tailwind CSS
- **PWA Support** - Install on mobile devices, works offline
- **Multiple Themes** - 7 built-in themes including Catppuccin and Gruvbox
- **Secure** - AES-256-GCM encryption for credentials, iron-session auth
- **Docker-First** - Easy deployment with Docker Compose

## Quick Start

### Docker Compose (Recommended)

```bash
# Clone the repository
git clone https://github.com/labitat/labitat.git
cd labitat

# Copy and edit configuration
cp config.yaml.example config.yaml
cp .env.example .env

# Edit .env and set a secure SECRET_KEY
# Generate one with: openssl rand -base64 32

# Start the container (using pre-built image)
docker run -d \
  --name labitat \
  -p 3000:3000 \
  -v $(pwd)/data:/data \
  -v $(pwd)/config.yaml:/app/config.yaml:ro \
  -e SECRET_KEY=$(openssl rand -base64 32) \
  ghcr.io/labitat/labitat:latest

# Or use docker-compose
docker compose up -d
```

Access the dashboard at `http://localhost:3000`.

### Docker Images

| Registry | Image |
|----------|-------|
| GitHub Container Registry | `ghcr.io/labitat/labitat` |

### Debian/Proxmox Installer

For native installation on Debian-based systems:

```bash
bash <(curl -s https://raw.githubusercontent.com/labitat/labitat/main/install.sh)
```

The installer will:
- Install Node.js 20 and pnpm
- Clone the repository to `/opt/labitat`
- Build the application
- Create a systemd service
- Prompt for admin credentials

## Supported Services

### Downloads
- Radarr, Sonarr, Lidarr, Readarr
- Prowlarr, qBittorrent, SABnzbd, Bazarr

### Media
- Jellyfin, Plex, Emby, Unmanic, Tautulli

### Networking
- Pi-hole, AdGuard Home, Nginx Proxy Manager, Traefik

### Monitoring
- Portainer, Uptime Kuma, Grafana, APCUPS, Unifi

### Automation
- Home Assistant

### Generic
- Generic Ping, Generic REST API

## Configuration

### Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | Yes | 32+ character random string for encryption |
| `DATABASE_URL` | Yes | SQLite path (default: `file:./data/labitat.db`) |
| `NODE_ENV` | Yes | Set to `production` for deployment |
| `PORT` | No | Override default port (3000) |

### config.yaml

```yaml
auth:
  email: admin@home.lab
  passwordHash: $2b$12$...  # bcrypt hash

app:
  title: My Homelab
  defaultPollingMs: 10000
```

Generate a password hash with:
```bash
node -e "require('bcryptjs').hash('yourpassword', 12).then(console.log)"
```

## Development

```bash
# Install dependencies
pnpm install

# Run development server
pnpm dev

# Build for production
pnpm build

# Run production server
pnpm start

# Database commands
pnpm db:push    # Push schema changes
pnpm db:studio  # Open database GUI
```

## Project Structure

```
labitat/
├── app/                    # Next.js App Router
├── components/             # React components
│   ├── dashboard/         # Dashboard UI
│   ├── editor/            # Item/group editors
│   ├── widgets/           # Service widgets
│   └── ui/                # shadcn/ui components
├── lib/
│   ├── adapters/          # Service definitions
│   ├── db/                # Database schema
│   ├── auth.ts            # Authentication
│   └── crypto.ts          # Encryption helpers
├── actions/                # Server actions
└── docker-compose.yml      # Docker configuration
```

## Adding a New Service

Creating a new service adapter is simple - just one file:

```bash
pnpm new-service
```

This generates a template with:
- Service definition (`lib/adapters/my-service.ts`)
- Widget component (`components/widgets/my-service.tsx`)

See [PROJECT_SPEC.md](./PROJECT_SPEC.md) for detailed documentation.

## Security

- All credentials are encrypted with AES-256-GCM before storage
- Session management via iron-session with HTTP-only cookies
- Security headers enabled (X-Frame-Options, CSP, etc.)
- Non-root user in Docker container
- Read-only filesystem where possible

## PWA Installation

### Desktop (Chrome/Edge)
1. Open the dashboard
2. Click the install icon in the address bar
3. Click "Install"

### iOS Safari
1. Open the dashboard
2. Tap the Share button
3. Tap "Add to Home Screen"

### Android Chrome
1. Open the dashboard
2. Tap the menu (⋮)
3. Tap "Install app"

## Troubleshooting

### Service not starting
```bash
# Check logs
docker compose logs labitat

# Or for systemd
journalctl -u labitat -f
```

### Database errors
```bash
# Reset database (WARNING: deletes all data)
rm ./data/labitat.db
pnpm db:push
```

### Permission issues (native install)
```bash
chown -R root:root /opt/labitat
chmod 755 /opt/labitat
chmod 600 /opt/labitat/.env /opt/labitat/config.yaml
```

## License

MIT License - see [LICENSE](./LICENSE) for details.

## Contributing

Contributions are welcome! Please read our [Contributing Guide](./CONTRIBUTING.md) first.

## Acknowledgments

- Built with [Next.js](https://nextjs.org/) and [shadcn/ui](https://ui.shadcn.com/)
- Icons from [selfh.st](https://selfh.st/icons)
- Inspired by [Homer](https://github.com/bastienwirtz/homer), [Dashy](https://github.com/Lissy93/dashy), and [Homepage](https://gethomepage.dev/)
