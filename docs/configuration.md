# Configuration

Labitat is designed to be zero-config, but we offer powerful environment variables to tune it for your specific homelab environment.

## Key Environment Variables

| Variable       | Default                  | Description                                                         |
| -------------- | ------------------------ | ------------------------------------------------------------------- |
| `SECRET_KEY`   | _(Auto)_                 | Used for encryption of service credentials. Must be 32+ characters. |
| `DATABASE_URL` | `file:./data/labitat.db` | Connection URL for the SQLite database.                             |
| `NODE_ENV`     | `development`            | Set to `production` when deploying for optimized performance.       |
| `PORT`         | `3000`                   | The port Labitat listens on.                                        |
| `SECRET_KEY`   | _(None)_                 | Key for encrypting service credentials. **Back this up.**           |

---

## Security & Encryption

One of Labitat's core principles is **secure credential storage**.

### The Secret Key

Labitat uses **AES-256-GCM** to encrypt your API keys and passwords. The encryption key is derived from your `SECRET_KEY` using **HKDF-SHA256**.

::: warning Keep it safe
If you lose your `SECRET_KEY`, you lose access to all stored service credentials.
:::

- **Docker:** A `SECRET_KEY` is automatically generated on the first run and stored in `/app/data/.secret_key`.
- **Native:** You should generate a strong random key manually:
  ```bash
  openssl rand -base64 32
  ```

---

## Database Management

Labitat uses **SQLite** via **Drizzle ORM** for its simplicity and robustness.

### Custom Database Path

To move your database to a different location:

```env
DATABASE_URL=file:/mnt/storage/homelab/labitat.db
```

### Management Commands

For advanced users managing their own instance manually:

| Command           | Purpose                                      |
| ----------------- | -------------------------------------------- |
| `pnpm db:push`    | Push schema changes directly to the database |
| `pnpm db:migrate` | Run production migrations                    |
| `pnpm db:studio`  | Open a GUI to browse your database content   |

---

## First Run Setup

On your first visit, Labitat will guide you through the **Setup Wizard**. This process handles:

1.  Creating the initial database schema.
2.  Setting up the primary **Admin Account**.
3.  Generating an encryption key (if one isn't provided).

::: info Account Security
All users created in Labitat are stored locally in your SQLite database. Labitat does not call home or use external authentication providers.
:::
