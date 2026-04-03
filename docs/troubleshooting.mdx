# Troubleshooting

Common issues and their solutions.

## Container Won't Start

```bash
docker compose logs labitat
```

Check the logs for errors. Common causes:

- Missing or invalid `SECRET_KEY`
- Port already in use
- Database file permissions

## Database Issues

### Reset Database

> **Warning:** This deletes all data.

```bash
rm ./data/labitat.db && pnpm db:push
```

### Run Migrations

```bash
pnpm db:push
```

### Open Database GUI

```bash
pnpm db:studio
```

## Service Widgets Not Loading

- Check that the service URL is reachable from the Labitat host
- Verify API keys and credentials are correct
- Check widget polling interval in dashboard settings

## Systemd Service (Native Install)

```bash
# View logs
journalctl -u labitat -f

# Restart
systemctl restart labitat

# Check status
systemctl status labitat
```

## Lost SECRET_KEY

If you lose your `SECRET_KEY`, all saved service credentials become unreadable. You'll need to:

1. Generate a new key: `openssl rand -base64 32`
2. Update `.env` with the new key
3. Re-enter all service credentials in the dashboard
