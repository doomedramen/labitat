# Docker Compose Installation

The recommended way to run Labitat.

## Setup

```bash
git clone https://github.com/DoomedRamen/labitat.git && cd labitat
cp .env.example .env
```

Edit `.env` and set your `SECRET_KEY`:

```bash
openssl rand -base64 32
```

Then start:

```bash
docker compose up -d
```

Visit `http://localhost:3000` to create your admin account.

## Docker Configuration

The `docker-compose.yml` includes:

- Port mapping `3000:3000`
- Volume mount for persistent data
- Non-root user (UID 1001)
- Read-only application directory

## Environment Variables

See [Configuration](/configuration) for all available environment variables.

## Updating

```bash
git pull
docker compose down
docker compose up -d --build
```
