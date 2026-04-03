# Plex

Media server.

## Configuration

| Field | Type | Required | Description |
|-------|------|----------|-------------|
| URL | URL | Yes | Plex server URL |
| API Key (X-Plex-Token) | Password | Yes | Plex authentication token |

## Finding Your API Key

1. Open Plex Web
2. Open browser dev tools → Network tab
3. Make any request — look for `X-Plex-Token` header

## Widget Displays

- Active streams
- Server status
- Library stats
