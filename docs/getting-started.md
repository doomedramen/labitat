# Getting Started

Welcome to the Labitat documentation. Labitat is a modern, self-hosted homelab dashboard.

## Quick Start

No config needed — a secret key is generated automatically on first run.

```bash
docker run -d \
  --name labitat \
  --restart unless-stopped \
  -p 3000:3000 \
  -v labitat_data:/app/data \
  ghcr.io/doomedramen/labitat:latest
```

Visit `http://localhost:3000` — you'll be guided to create your admin account on first visit.

![Labitat Dashboard](/images/labitat_dash.png)

## Next Steps

- [Installation](/installation/) — All installation methods (Docker Compose, native, manual)
- [Configuration](/configuration) — Environment variables and settings
- [Services](/services/) — Supported services and how to add them
- [Development](/development) — How to contribute

## Customizing Your Dashboard

After setup, you can customize your dashboard by entering edit mode. Drag and drop widgets to arrange them however you like.

![Dashboard Edit Mode](/images/labitat_dash_edit.png)
