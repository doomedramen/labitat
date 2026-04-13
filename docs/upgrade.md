# Upgrade & Backup Guide

This document covers the recommended procedures for upgrading Labitat and backing up your data.

## Backing Up Data

We recommend backing up your data directory and `.env` file before every upgrade.

### Docker

If you use a named volume:

```bash
docker compose down
docker run --rm -v labitat_data:/app/data -v $(pwd):/backup alpine tar czf /backup/labitat-backup.tar.gz -C /app/data .
```

### Native

If you run Labitat manually:

```bash
systemctl stop labitat
tar czf labitat-backup.tar.gz /var/lib/labitat/
systemctl start labitat
```

**Important**: Also back up your `.env` file (or at minimum the `SECRET_KEY`). Without it, all stored service credentials are unrecoverable.

## Restoring Data

### Docker

```bash
docker run --rm -v labitat_data:/app/data -v $(pwd):/backup alpine tar xzf /backup/labitat-backup.tar.gz -C /app/data
docker compose up -d
```

### Native

```bash
systemctl stop labitat
rm -rf /var/lib/labitat/*
tar xzf labitat-backup.tar.gz -C /var/lib/labitat/
systemctl start labitat
```

## Breaking Changes

### v0.0.53+ (Current)

- `drizzle-kit` moved from `dependencies` to `devDependencies` — no impact on Docker builds
- `proxy.ts` replaces `middleware.ts` (Next.js 15.3+ naming)
- `hasAdminUser()` extracted to `src/lib/db/admin.ts` — if you have custom code importing it from `actions/auth`, update the import
- Environment variables are now validated via `@t3-oss/env-core` — startup will fail if `SECRET_KEY` is missing or too short

### v0.0.52 and Earlier

- Initial release — no prior versions to migrate from

## Troubleshooting Upgrades

### Database migration failed

Labitat uses Drizzle ORM for database schema management. Migrations are stored in `drizzle/` and run automatically on startup.

Common causes:

- Corrupted database file — restore from backup
- Missing migration files — ensure `drizzle/` is present in the image

### SECRET_KEY lost

If you lose your `SECRET_KEY`, stored service credentials cannot be decrypted. You'll need to:

1. Reset the `SECRET_KEY` in your `.env` file
2. Re-enter credentials for all services in the dashboard
