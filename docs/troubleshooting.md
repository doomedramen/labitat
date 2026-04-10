# Troubleshooting

## Container won't start

```bash
docker compose logs labitat
```

Common causes:

- **Invalid SECRET_KEY**: Must be 32+ characters. Generate one with `openssl rand -base64 32`
- **Port conflict**: Port 3000 already in use. Override with `-p 3001:3000` or set `PORT=3001`
- **Permission issues**: Ensure the volume is owned by UID 1001

## Database issues

### Reset database (WARNING: deletes all data)

```bash
docker compose down
docker volume rm labitat_data
docker compose up -d
```

### Migration errors

```bash
docker compose exec labitat node scripts/migrate.js
```

## Service widgets not loading

- Check that the service URL is reachable from the Labitat host
- Verify API keys and credentials in the dashboard settings
- Check widget polling interval in dashboard settings
- Look for errors in the browser console (F12)

## UniFi Adapter: Self-Signed Certificate Errors

If your UniFi controller uses a self-signed SSL certificate, you may see errors like:

```
Error: self-signed certificate
code: 'DEPTH_ZERO_SELF_SIGNED_CERT'
```

### Solution

Set the following environment variable in your `.env` file or Docker compose:

```env
NODE_TLS_REJECT_UNAUTHORIZED=0
```

This tells Node.js to skip TLS certificate validation, allowing connections to servers with self-signed certificates.

### ⚠️ Security Warning

Disabling TLS verification makes your connection vulnerable to man-in-the-middle attacks. Only use this option:

- In trusted/local networks
- When connecting to your own UniFi controller
- When you cannot install a proper SSL certificate

### Alternative: Use a Proper SSL Certificate

For production environments, consider installing a proper SSL certificate on your UniFi controller instead of disabling verification. See the [UniFi documentation](https://help.ui.com/hc/en-us/articles/360015263453) for instructions on installing SSL certificates.

## Glances Adapter Issues

### No data showing

- Ensure Glances API is accessible: `curl http://your-glances-host:61208/api/4/quicklook`
- Glances must be running with API enabled: `glances -w` or `glances --web-server`
- Default port is 61208

### Timeseries widget not working

- Requires cache directory to be writable
- Ensure `CACHE_DIR` is set and persists across restarts (Docker: `/data/cache`)

## Proxmox / Proxmox Backup Server

### Authentication errors

- Use API tokens, not root password: `user@pam!tokenid`
- API token must have at least `PVEAuditor` role (Proxmox) or `Datastore.Audit` (PBS)
- Verify the token is not expired

## Pi-hole / AdGuard Home

### Connection refused

- Ensure the DNS service API is enabled and accessible
- Pi-hole: API token from Settings → API → Show API token
- AdGuard: username/password with admin access

## Systemd service (native install)

```bash
journalctl -u labitat -f
systemctl restart labitat
systemctl status labitat
```

## Encryption key lost

If you lose your `SECRET_KEY`, all saved service credentials are unrecoverable. You'll need to:

1. Set a new `SECRET_KEY`
2. Re-enter all service credentials through the dashboard

This is by design — credentials are encrypted with AES-256-GCM and cannot be decrypted without the original key.
