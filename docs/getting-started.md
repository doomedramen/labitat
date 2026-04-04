# Getting Started

Welcome to the Labitat documentation. Labitat is a modern, self-hosted homelab dashboard.

## Quick Start

The fastest way to get up and running is with Docker Compose:

```bash
git clone https://github.com/DoomedRamen/labitat.git && cd labitat
cp .env.example .env

# Edit .env and set SECRET_KEY (generate with: openssl rand -base64 32)
docker compose up -d
```

Visit `http://localhost:3000` — you'll be guided to create your admin account on first visit.

![Labitat Dashboard](/images/labitat_dash.png)

## Next Steps

- [Installation](/installation/) — Detailed installation guides
- [Configuration](/configuration) — Environment variables and settings
- [Services](/services/) — Supported services and how to add them
- [Development](/development) — How to contribute

## Customizing Your Dashboard

After setup, you can customize your dashboard by entering edit mode. Drag and drop widgets to arrange them however you like.

![Dashboard Edit Mode](/images/labitat_dash_edit.png)
