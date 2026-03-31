# Labitat — Project Plan

> A self-hosted homelab dashboard built with Next.js, shadcn/ui, and Drizzle ORM.
> Single authenticated user, drag-and-drop layout, service widgets, full PWA support.

---

## Table of contents

1. [Overview](#overview)
2. [Tech stack](#tech-stack)
3. [Architecture](#architecture)
4. [Directory structure](#directory-structure)
5. [Database schema](#database-schema)
6. [Authentication](#authentication)
7. [Layout system](#layout-system)
8. [Service adapter system](#service-adapter-system)
9. [Polling and caching](#polling-and-caching)
10. [Themes](#themes)
11. [PWA](#pwa)
12. [Deployment](#deployment)
13. [V1 service adapters](#v1-service-adapters)
14. [Build order](#build-order)
15. [Contributing a new service](#contributing-a-new-service)

---

## Overview

Labitat is a homelab dashboard in the style of Homer, Dashy, and Homepage, but with a modern architecture and an in-app editing experience. There is no config file to define items — instead, a single authenticated user manages the dashboard directly in the UI.

Key design goals:

- Zero-friction service widget contributions (one file = one service)
- Drag-and-drop layout with named groups
- Full PWA — installable, offline-capable
- Clean, modern UI built entirely on shadcn/ui components
- Multiple built-in themes
- Docker-first deployment, with a Debian/Proxmox installer script

---

## Tech stack

| Concern | Choice | Notes |
|---|---|---|
| Framework | Next.js 15 (App Router) | Server components, server actions, API routes |
| Language | TypeScript | Strict mode throughout |
| UI components | shadcn/ui | Radix primitives + Tailwind |
| Styling | Tailwind CSS | CSS custom properties for theming |
| Database | SQLite via Drizzle ORM | `better-sqlite3` driver, schema in TypeScript |
| Migrations | drizzle-kit | `drizzle-kit push` in dev, `migrate` in prod |
| Auth | iron-session | Encrypted HTTP-only cookie, bcrypt password hash |
| Drag and drop | dnd-kit | Edit-mode only, within and between groups |
| PWA | Native Next.js + manual service worker | Cache-first shell, network-first data; Serwist optional for Workbox abstractions |
| Credential encryption | AES-256-GCM | Via `SECRET_KEY` env var, never sent to client |
| Package manager | pnpm | |

---

## Architecture

```
Browser / PWA client
  └── React · shadcn/ui · dnd-kit · service worker

Next.js 15 App Router
  ├── Server components (dashboard render)
  ├── Server actions (mutations — all auth-gated)
  ├── /api/services/[id] (per-item polling endpoint)
  └── Middleware (session check on protected routes)

Auth layer
  └── iron-session · bcrypt · HTTP-only cookie

Data layer
  └── Drizzle ORM → SQLite (/data/labitat.db)

Service adapter layer
  ├── lib/adapters/*.ts (one file per service)
  ├── Auto-discovered registry (glob import)
  └── Server-side fetch + in-memory cache (rate limiting)

External homelab services
  └── Polled every N seconds per item
```

---

## Directory structure

```
labitat/
├── app/
│   ├── (auth)/
│   │   └── login/
│   │       └── page.tsx
│   ├── (dashboard)/
│   │   ├── layout.tsx          # Protected layout, session check
│   │   └── page.tsx            # Main dashboard
│   ├── api/
│   │   ├── services/
│   │   │   └── [id]/
│   │   │       └── route.ts    # Per-item live data endpoint
│   │   └── health/
│   │       └── route.ts
│   ├── manifest.ts             # Dynamic PWA manifest
│   ├── globals.css
│   └── layout.tsx
│
├── components/
│   ├── dashboard/
│   │   ├── dashboard.tsx       # Top-level dashboard component
│   │   ├── group.tsx           # Named group container
│   │   ├── item.tsx            # Single dashboard item card
│   │   └── edit-bar.tsx        # Edit mode toolbar
│   ├── editor/
│   │   ├── item-dialog.tsx     # Add / edit item dialog
│   │   ├── group-dialog.tsx    # Add / edit group dialog
│   │   └── field-renderer.tsx  # Auto-renders configFields
│   ├── widgets/
│   │   ├── radarr.tsx
│   │   ├── sonarr.tsx
│   │   ├── homeassistant.tsx
│   │   └── ...                 # One widget component per service
│   └── ui/                     # shadcn/ui re-exports
│
├── lib/
│   ├── db/
│   │   ├── index.ts            # Drizzle client singleton
│   │   ├── schema.ts           # Table definitions
│   │   └── migrations/
│   ├── adapters/
│   │   ├── types.ts            # ServiceDefinition, FieldDef, ServiceData
│   │   ├── index.ts            # Auto-discovery registry (never edited manually)
│   │   ├── radarr.ts
│   │   ├── sonarr.ts
│   │   └── ...
│   ├── auth.ts                 # iron-session config + session helpers
│   ├── crypto.ts               # AES-256-GCM encrypt/decrypt for API keys
│   └── cache.ts                # In-memory response cache (TTL-based)
│
├── actions/
│   ├── items.ts                # Server actions: createItem, updateItem, deleteItem
│   ├── groups.ts               # Server actions: createGroup, updateGroup, deleteGroup
│   └── settings.ts             # Server actions: updateTheme, updatePolling, etc.
│
├── public/
│   ├── icons/                  # PWA icons (all sizes + maskable)
│   │   ├── icon-192x192.png
│   │   ├── icon-512x512.png
│   │   └── icon-maskable-512x512.png
│   └── offline.html
│
├── styles/
│   └── themes.css              # CSS custom property sets per theme
│
├── scripts/
│   └── new-service.ts          # CLI scaffold: pnpm new-service
│
├── config.yaml                 # Password hash + app-level settings
├── drizzle.config.ts
├── next.config.ts
├── Dockerfile
├── docker-compose.yml
├── install.sh                  # Debian / Proxmox helper installer
└── .env.example
```

---

## Database schema

Defined in `lib/db/schema.ts` using Drizzle's TypeScript schema DSL.

```typescript
import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core'
import { sql } from 'drizzle-orm'

export const groups = sqliteTable('groups', {
  id:        text('id').primaryKey(),
  name:      text('name').notNull(),
  order:     integer('order').notNull(),
  createdAt: text('created_at').default(sql`(current_timestamp)`),
})

export const items = sqliteTable('items', {
  id:          text('id').primaryKey(),
  groupId:     text('group_id').notNull().references(() => groups.id, { onDelete: 'cascade' }),
  label:       text('label').notNull(),
  href:        text('href'),
  iconUrl:     text('icon_url'),           // selfh.st CDN slug or custom URL
  serviceType: text('service_type'),       // adapter id, e.g. 'radarr'
  serviceUrl:  text('service_url'),
  apiKeyEnc:   text('api_key_enc'),        // AES-256-GCM encrypted
  configEnc:   text('config_enc'),         // full config object, encrypted
  order:       integer('order').notNull(),
  pollingMs:   integer('polling_ms').default(10000),
  createdAt:   text('created_at').default(sql`(current_timestamp)`),
})

export const settings = sqliteTable('settings', {
  key:   text('key').primaryKey(),
  value: text('value').notNull(),
})
```

Key settings rows:

| key | example value |
|---|---|
| `theme` | `catppuccin-mocha` |
| `defaultPollingMs` | `10000` |
| `dashboardTitle` | `My Homelab` |

---

## Authentication

Labitat has a single user. Their email and bcrypt password hash are stored in `config.yaml`:

```yaml
auth:
  email: admin@home.lab
  passwordHash: $2b$12$...
```

Session management uses **iron-session** — an encrypted, tamper-proof HTTP-only cookie. No JWTs, no refresh tokens, no database session table.

Flow:

1. User submits login form → server action verifies password with `bcrypt.compare`
2. On success, `iron-session` writes an encrypted cookie containing `{ userId: 'admin', loggedIn: true }`
3. Middleware checks session on all `/(dashboard)` routes and all server actions
4. Session has no hard expiry (homelab context — user controls their own network)

All server actions begin with:

```typescript
const session = await getSession()
if (!session.loggedIn) throw new Error('Unauthorized')
```

---

## Layout system

The dashboard is organised into **named groups**. Each group is a labelled section containing a row or column of items. Groups and items can be reordered via drag-and-drop.

- **View mode** — default state, read-only, no drag handles visible
- **Edit mode** — toggled by a button in the top bar (or keyboard shortcut `E`), shows drag handles, add/edit/delete controls

Drag and drop is implemented with **dnd-kit**:

- Items can be dragged within a group or between groups
- Groups can be reordered relative to each other
- Order is persisted to SQLite via a server action on drop

Item card anatomy:

```
┌─────────────────────────────────┐
│  [icon]  Label          [status]│
│          subtitle / live data   │
└─────────────────────────────────┘
```

Status indicator states: `ok` (green dot), `warn` (amber dot), `error` (red dot), `loading` (spinner), `none` (no indicator — link-only items).

---

## Service adapter system

This is the most important architectural decision in the project. The goal is **minimal friction for contributors** — adding a new service requires creating a single file and nothing else.

### The `ServiceDefinition` interface

```typescript
// lib/adapters/types.ts

export type FieldType = 'url' | 'password' | 'text' | 'number' | 'select' | 'boolean'

export type FieldDef = {
  key:          string
  label:        string
  type:         FieldType
  required?:    boolean
  placeholder?: string
  helperText?:  string
  options?:     { label: string; value: string }[]   // for 'select' type
}

export type ServiceCategory =
  | 'media'
  | 'downloads'
  | 'networking'
  | 'monitoring'
  | 'storage'
  | 'automation'
  | 'security'
  | 'finance'
  | 'productivity'
  | 'info'

export type ServiceData = {
  _status?:     'ok' | 'warn' | 'error'
  _statusText?: string
  [key: string]: unknown
}

export type ServiceDefinition<TData extends ServiceData = ServiceData> = {
  id:               string
  name:             string
  icon:             string                         // selfh.st slug or full URL
  category:         ServiceCategory
  configFields:     FieldDef[]
  defaultPollingMs?: number
  fetchData:        (config: Record<string, string>) => Promise<TData>
  Widget:           React.FC<TData>
}
```

### Example adapter — Radarr

```typescript
// lib/adapters/radarr.ts
import type { ServiceDefinition } from './types'
import { RadarrWidget } from '@/components/widgets/radarr'

export const definition: ServiceDefinition = {
  id:       'radarr',
  name:     'Radarr',
  icon:     'radarr',
  category: 'downloads',
  defaultPollingMs: 10_000,

  configFields: [
    { key: 'url',    label: 'URL',     type: 'url',      required: true },
    { key: 'apiKey', label: 'API key', type: 'password', required: true },
  ],

  async fetchData(config) {
    const res = await fetch(`${config.url}/api/v3/queue/status`, {
      headers: { 'X-Api-Key': config.apiKey },
    })
    if (!res.ok) throw new Error('Radarr unreachable')
    const data = await res.json()
    return {
      _status:  'ok',
      queued:   data.totalCount,
      errors:   data.errors,
      warnings: data.warnings,
    }
  },

  Widget: RadarrWidget,
}
```

### Auto-discovery registry

```typescript
// lib/adapters/index.ts  — never edited manually
import type { ServiceDefinition } from './types'

const modules = import.meta.glob<{ definition: ServiceDefinition }>(
  './*.ts',
  { eager: true }
)

export const registry: Record<string, ServiceDefinition> = Object.fromEntries(
  Object.values(modules)
    .filter(m => m.definition)
    .map(m => [m.definition.id, m.definition])
)
```

New service = new file. The registry picks it up automatically at build time. Contributors never touch `index.ts`.

### `configFields` types

| Type | UI rendered | Storage |
|---|---|---|
| `url` | URL input with validation | Plain text |
| `password` | Masked input | AES-256-GCM encrypted |
| `text` | Text input | Plain text |
| `number` | Number input | Plain text |
| `select` | Dropdown | Plain text |
| `boolean` | Toggle switch | Plain text (`'true'`/`'false'`) |

Any field with `type: 'password'` is automatically encrypted before hitting the database and is never included in any client-side response.

---

## Polling and caching

Live data is fetched by the browser polling `/api/services/[id]` at the item's configured interval.

Server-side flow:

1. Route handler receives request for item `id`
2. Verifies session (unauthenticated requests return 401)
3. Loads item config from DB, decrypts credentials
4. Checks in-memory cache — if fresh (within `pollingMs`), returns cached response
5. Otherwise calls `adapter.fetchData(config)`, stores result in cache, returns it

This means even if the user has 20 items all polling at 10s, each backing service sees at most one request per polling interval regardless of how many browser tabs are open.

Cache is in-memory (per process) using a simple `Map<id, { data, timestamp }>`. On Docker restart the cache is cleared — this is acceptable for a homelab context.

---

## Themes

Themes are implemented as CSS custom property sets applied to the `<html>` element via a `data-theme` attribute.

```css
/* styles/themes.css */

[data-theme="dark"] {
  --bg-primary:   #1e1e2e;
  --bg-secondary: #181825;
  --fg-primary:   #cdd6f4;
  --accent:       #cba6f7;
  /* ... */
}

[data-theme="nord"] {
  --bg-primary:   #2e3440;
  --bg-secondary: #3b4252;
  --fg-primary:   #eceff4;
  --accent:       #88c0d0;
  /* ... */
}
```

Active theme is stored in the `settings` table and applied server-side to avoid flash-of-wrong-theme. The user can switch themes from the settings panel.

### V1 themes

| ID | Name |
|---|---|
| `light` | Light |
| `dark` | Dark |
| `amoled` | AMOLED |
| `nord` | Nord |
| `catppuccin-mocha` | Catppuccin Mocha |
| `catppuccin-latte` | Catppuccin Latte |
| `gruvbox` | Gruvbox |

---

## PWA

Labitat is a fully compliant Progressive Web App.

### Requirements met

- `app/manifest.ts` with `display: standalone`, correct `start_url`, `theme_color` — built into Next.js App Router, no plugin required
- All required icon sizes: 192×192, 512×512, maskable 512×512
- Service worker written manually at `public/sw.js`, registered client-side — no `next-pwa` or Workbox plugin needed
- HTTPS-only in production (enforced by middleware header)
- Offline fallback page (`public/offline.html`)
- iOS "Add to Home Screen" prompt (browser install prompt doesn't work on Safari iOS — show manual instructions instead)

### Service worker

Next.js does not auto-generate a service worker. `public/sw.js` is written by hand using the Cache API directly. If Workbox abstractions are desired, [Serwist](https://github.com/serwist/serwist) can be added — but it requires webpack, which conflicts with Turbopack in dev. Keep it manual unless complexity justifies the trade-off.

Register the service worker in the root client layout:

```typescript
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('/sw.js', { scope: '/', updateViaCache: 'none' })
}
```

### Cache strategy

| Resource type | Strategy |
|---|---|
| App shell (HTML, JS, CSS) | Cache-first |
| Static assets (fonts, icons) | Cache-first |
| `/api/services/*` (live data) | Network-first, fall back to last cached response |
| External service URLs | Not cached |

When offline, the dashboard renders from cache in read-only mode. Edit mode is disabled. Live data widgets show their last cached values with a subtle "offline" indicator.

### Security headers

Add to `next.config.ts`:

```typescript
async headers() {
  return [
    {
      source: '/(.*)',
      headers: [
        { key: 'X-Content-Type-Options', value: 'nosniff' },
        { key: 'X-Frame-Options', value: 'DENY' },
        { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
      ],
    },
    {
      source: '/sw.js',
      headers: [
        { key: 'Content-Type', value: 'application/javascript; charset=utf-8' },
        { key: 'Cache-Control', value: 'no-cache, no-store, must-revalidate' },
        { key: 'Content-Security-Policy', value: "default-src 'self'; script-src 'self'" },
      ],
    },
  ]
},
```

---

## Deployment

### Docker (primary)

```dockerfile
# Dockerfile
FROM node:20-alpine AS builder
WORKDIR /app
COPY . .
RUN pnpm install --frozen-lockfile
RUN pnpm build

FROM node:20-alpine AS runner
WORKDIR /app
COPY --from=builder /app/.next/standalone ./
COPY --from=builder /app/public ./public
COPY --from=builder /app/.next/static ./.next/static

ENV NODE_ENV=production
ENV DATABASE_URL=file:/data/labitat.db

VOLUME ["/data"]
EXPOSE 3000
CMD ["node", "server.js"]
```

```yaml
# docker-compose.yml
services:
  labitat:
    image: labitat/labitat:latest
    container_name: labitat
    restart: unless-stopped
    ports:
      - "3000:3000"
    volumes:
      - labitat_data:/data
      - ./config.yaml:/app/config.yaml:ro
    environment:
      - SECRET_KEY=change_me_to_a_random_32_char_string
      - NODE_ENV=production

volumes:
  labitat_data:
```

### Debian / Proxmox installer

A single `install.sh` script in the style of the Proxmox helper scripts community:

```bash
bash <(curl -s https://raw.githubusercontent.com/labitat/labitat/main/install.sh)
```

The script:

1. Installs Node.js 20 via NodeSource
2. Installs pnpm
3. Clones the repo to `/opt/labitat`
4. Runs `pnpm install && pnpm build`
5. Creates a `systemd` service (`labitat.service`)
6. Prompts for `SECRET_KEY` and initial admin password
7. Writes `config.yaml` and `.env`
8. Starts and enables the service

### Environment variables

| Variable | Required | Description |
|---|---|---|
| `SECRET_KEY` | Yes | 32+ char random string for AES encryption and session signing |
| `DATABASE_URL` | Yes | SQLite path, e.g. `file:/data/labitat.db` |
| `NODE_ENV` | Yes | `production` |
| `PORT` | No | Default `3000` |

### `config.yaml`

```yaml
auth:
  email: admin@home.lab
  passwordHash: $2b$12$...   # bcrypt hash, generated on first run

app:
  title: My Homelab
  defaultPollingMs: 10000
```

---

## V1 service adapters

~20 adapters to ship with the initial release, covering the most common homelab services.

| Service | Category | Data shown |
|---|---|---|
| Radarr | downloads | Queue count, errors |
| Sonarr | downloads | Queue count, upcoming |
| Lidarr | downloads | Queue count |
| Readarr | downloads | Queue count |
| Prowlarr | downloads | Indexer count, status |
| qBittorrent | downloads | Active torrents, speeds |
| SABnzbd | downloads | Queue size, speed |
| Jellyfin | media | Active streams, libraries |
| Plex | media | Active streams |
| Emby | media | Active streams |
| Home Assistant | automation | Entity state (sensor/switch/binary) |
| Proxmox | monitoring | Node CPU/RAM, VM/CT status |
| Portainer | monitoring | Container running/stopped count |
| Pi-hole | networking | Queries blocked today, % |
| AdGuard Home | networking | Queries blocked today, % |
| Nginx Proxy Manager | networking | Proxy host count, status |
| Traefik | networking | Router/service count |
| Uptime Kuma | monitoring | Monitor up/down counts |
| Grafana | monitoring | Alert count, datasource status |
| Unmanic | media | Queue length, workers |
| Generic ping | monitoring | Up/down, response time ms |
| Generic REST | monitoring | Custom JSON path extraction |

---

## Build order

### Step 1 — Project scaffold
- Init Next.js 15 with TypeScript, Tailwind, shadcn/ui
- Set up Drizzle ORM with SQLite (`better-sqlite3`)
- Define schema (`groups`, `items`, `settings`)
- Run initial migration
- Set up iron-session auth (login page, session helpers, middleware)

### Step 2 — Dashboard layout
- Dashboard page with group + item rendering (server components)
- Group and item card components
- Edit mode toggle (client state, persisted to `settings`)
- Add / edit / delete dialogs for groups and items

### Step 3 — Drag and drop
- Integrate dnd-kit
- Drag items within groups
- Drag items between groups
- Drag groups to reorder
- Persist order on drop via server actions

### Step 4 — Adapter system
- Define `ServiceDefinition`, `FieldDef`, `ServiceData` types
- Implement auto-discovery registry
- Build `/api/services/[id]` polling route with in-memory cache
- Implement AES-256-GCM encrypt/decrypt for credentials
- Build `field-renderer.tsx` — auto-renders `configFields` as a typed form

### Step 5 — Service adapters
- Implement all ~22 V1 adapters
- Build corresponding widget components
- Test against real service instances

### Step 6 — Themes
- Define CSS custom property sets for all 7 themes
- Theme switcher in settings panel
- Server-side theme application (no FOUC)

### Step 7 — PWA
- Write `app/manifest.ts` (built-in App Router support, no plugin needed)
- Generate all icon sizes + maskable variant
- Write `public/sw.js` manually with Cache API (cache-first shell, network-first for `/api/services/*`)
- Register service worker in root client layout
- Implement offline fallback page (`public/offline.html`)
- Add iOS "Add to Home Screen" install prompt component
- Add security headers to `next.config.ts`
- Audit with Lighthouse

### Step 8 — Deployment
- Write `Dockerfile` (multi-stage, standalone output)
- Write `docker-compose.yml`
- Write `install.sh` (Debian/Proxmox helper)
- Write `.env.example`
- First-run setup (generate password hash, write `config.yaml`)

---

## Contributing a new service

The scaffold CLI generates all the boilerplate:

```bash
pnpm new-service
```

This prompts for the service name, category, and config fields, then generates:

- `lib/adapters/my-service.ts` — with `fetchData` stub
- `components/widgets/my-service.tsx` — with widget component stub

A contributor then only needs to:

1. Fill in `fetchData` with the real API call
2. Design the widget component with the data returned
3. Open a PR

The service appears in the registry, item editor, and dashboard automatically — no other files need to be touched.

### Adapter checklist for contributors

- `id` is lowercase, hyphen-separated, unique
- `icon` matches a slug from [selfh.st/icons](https://selfh.st/icons) where possible
- All sensitive config fields use `type: 'password'`
- `fetchData` throws a descriptive `Error` on failure (sets `_status: 'error'` automatically)
- `fetchData` runs server-side only — never import it in client components
- Widget handles loading and error states gracefully
- `defaultPollingMs` is set to a sensible value for the service (most: 10000)

---

*Last updated: project planning phase — pre-implementation*
