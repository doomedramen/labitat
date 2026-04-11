# Docker Installation

The recommended way to run Labitat. No config required — a secret key is generated automatically on first run.

## Docker Run (Simplest)

```bash
docker run -d \
  --name labitat \
  --restart unless-stopped \
  -p 3000:3000 \
  -v labitat_data:/app/data \
  ghcr.io/doomedramen/labitat:latest
```

Visit `http://localhost:3000` to create your admin account.

## Docker Compose

Download the compose file (no need to clone the full repo):

```bash
curl -fsSL https://raw.githubusercontent.com/DoomedRamen/labitat/main/docker-compose.yml -o docker-compose.yml
docker compose up -d
```

## Secret Key

Labitat needs a `SECRET_KEY` (32+ chars) to encrypt stored credentials. By default, one is generated automatically on first run and saved to `/app/data/.secret_key` inside the volume.

To set your own key instead:

```bash
export SECRET_KEY=$(openssl rand -base64 32)
docker compose up -d
```

> Back up your `labitat_data` volume — it contains both the database and the secret key.

## Environment Variables

See [Configuration](/configuration) for all available environment variables.

## Updating

```bash
docker compose pull
docker compose up -d
```
