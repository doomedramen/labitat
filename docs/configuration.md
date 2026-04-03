# Configuration

Labitat is configured through environment variables and the built-in setup wizard.

## Environment Variables

| Variable | Required | Description |
|----------|----------|-------------|
| `SECRET_KEY` | **Yes** | 32+ char random string for encryption |
| `DATABASE_URL` | No | SQLite path (default: `./data/labitat.db`) |
| `NODE_ENV` | No | Set to `production` for deployment |
| `PORT` | No | Override default port (3000) |

## Secret Key

Set `SECRET_KEY` in `.env` to a random string:

```bash
openssl rand -base64 32
```

This key encrypts stored service credentials using AES-256-GCM. **Back it up** — lose it and you lose access to saved credentials.

## First Run: Create Admin Account

On your first visit, you'll be redirected to a setup page to create your admin account. Credentials are stored in the database — no config files to edit.

## Database

Labitat uses SQLite by default. To use a custom path:

```env
DATABASE_URL=file:/path/to/labitat.db
```

### Database Commands

```bash
pnpm db:push      # Push schema changes to SQLite
pnpm db:studio    # Open Drizzle Studio (database GUI)
pnpm db:generate  # Generate migration files
pnpm db:migrate   # Run migrations
```
