# Migration & Upgrade Guide

## Upgrading Labitat

### Docker Compose

```bash
cd labitat
docker compose pull
docker compose up -d
```

Docker Compose will:

1. Pull the latest image
2. Stop the old container
3. Start a new container with the updated image
4. Database migrations run automatically on startup (see `docker-entrypoint.sh`)

Your data persists in the Docker volume, so no data is lost during upgrades.

### Native Install (install.sh)

```bash
cd /opt/labitat
git pull
pnpm install --frozen-lockfile
pnpm build
systemctl restart labitat
```

Database migrations run automatically via the `scripts/migrate.js` script invoked by the systemd service's startup.

### Manual Install

```bash
git pull
pnpm install --frozen-lockfile
pnpm db:push    # or: node scripts/migrate.js
pnpm build
pnpm start
```

## Database Migrations

Labitat uses Drizzle ORM for database schema management. Migrations are stored in `lib/db/migrations/` and run automatically on startup.

### How Migrations Work

1. On container/service startup, `scripts/migrate.js` runs
2. It compares the migration files against the `__drizzle_migrations` table in SQLite
3. Any pending migrations are applied in order
4. If no new migrations exist, the step completes instantly

### Manual Migration Commands

```bash
# Push schema changes (development only — generates and applies migrations)
pnpm db:push

# Generate a new migration file from schema changes
pnpm db:generate

# Run pending migrations (what the startup script does)
pnpm db:migrate

# Open database GUI for inspection
pnpm db:studio
```

## Backup & Restore

### Backup

```bash
# Docker
docker compose down
docker run --rm -v labitat_data:/app/data -v $(pwd):/backup alpine tar czf /backup/labitat-backup.tar.gz -C /app/data .

# Native
systemctl stop labitat
tar czf labitat-backup.tar.gz /var/lib/labitat/
systemctl start labitat
```

**Important**: Also back up your `.env` file (or at minimum the `SECRET_KEY`). Without it, all stored service credentials are unrecoverable.

### Restore

```bash
# Docker
docker compose down
docker run --rm -v labitat_data:/app/data -v $(pwd):/backup alpine tar xzf /backup/labitat-backup.tar.gz -C /app/data
docker compose up -d

# Native
systemctl stop labitat
rm -rf /var/lib/labitat/*
tar xzf labitat-backup.tar.gz -C /var/lib/labitat/
systemctl start labitat
```

## Breaking Changes

### v0.0.53+ (Current)

- `drizzle-kit` moved from `dependencies` to `devDependencies` — no impact on Docker builds
- `proxy.ts` replaces `middleware.ts` (Next.js 15.3+ naming)
- `hasAdminUser()` extracted to `lib/db/admin.ts` — if you have custom code importing it from `actions/auth`, update the import
- Environment variables are now validated via `@t3-oss/env-core` — startup will fail if `SECRET_KEY` is missing or too short

### v0.0.52 and Earlier

- Initial release — no prior versions to migrate from

## Troubleshooting Upgrades

### Migration fails on startup

Check the container logs:

```bash
docker compose logs labitat
```

Common causes:

- Corrupted database file — restore from backup
- Missing migration files — ensure `lib/db/migrations/` is present in the image

### SECRET_KEY lost

If you lose your `SECRET_KEY`, stored service credentials cannot be decrypted. You'll need to:

1. Generate a new `SECRET_KEY`
2. Re-enter all service credentials in the dashboard settings

### Container won't start after upgrade

1. Check logs: `docker compose logs labitat`
2. Verify environment variables are set correctly
3. Ensure the data volume is mounted at `/app/data`
4. Try rolling back: `docker compose pull <previous-tag>` and `docker compose up -d`
