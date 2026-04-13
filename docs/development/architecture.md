# Architecture Overview

This document explains the high-level architecture of Labitat, including the service adapter pattern, data flow, and key design decisions.

## System Overview

```
┌─────────────────────────────────────────────────────────────────┐
│                         Browser Client                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Dashboard   │  │  Edit Mode   │  │  Service Widgets     │  │
│  │  (SSR/CSR)    │  │  (DnD/KIT)   │  │  (SWR Polling)       │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                  │                      │              │
└─────────┼──────────────────┼──────────────────────┼──────────────┘
          │                  │                      │
          ▼                  ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                      Next.js Server Layer                        │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │  Page Routes  │  │   Actions    │  │   API Routes         │  │
│  │  (app/)       │  │  (src/actions)│  │   (src/app/api/)     │  │
│  └──────┬───────┘  └──────┬───────┘  └──────────┬───────────┘  │
│         │                  │                      │              │
└─────────┼──────────────────┼──────────────────────┼──────────────┘
          │                  │                      │
          ▼                  ▼                      ▼
┌─────────────────────────────────────────────────────────────────┐
│                       Business Logic Layer                       │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Database   │  │   Adapters   │  │   Utilities          │  │
│  │  (src/lib/db) │  │(src/lib/adapters)│  │  (src/lib/*.ts)     │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
│                                                                  │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────────────┐  │
│  │   Auth       │  │   Crypto     │  │   Cache              │  │
│  │(src/lib/auth) │  │ (AES-GCM)    │  │  (in-memory + TTL)   │  │
│  └──────────────┘  └──────────────┘  └──────────────────────┘  │
└─────────────────────────────────────────────────────────────────┘
          │
          ▼
┌─────────────────────────────────────────────────────────────────┐
│                      External Services                           │
│  Radarr │ Sonarr │ Plex │ AdGuard │ Glances │ OpenMeteo │ ...   │
└─────────────────────────────────────────────────────────────────┘
```

## Core Design Patterns

### 1. Service Adapter Pattern

The adapter pattern is the heart of Labitat's extensibility. Each service (Radarr, Plex, etc.) is encapsulated in a self-contained definition that includes:

```typescript
// src/lib/adapters/types.ts
type ServiceDefinition<TData> = {
  id: string; // Unique identifier (e.g., "radarr")
  name: string; // Display name
  icon: string; // selfh.st icon slug or URL
  category: ServiceCategory; // For grouping in UI
  configFields: FieldDef[]; // Form fields for credentials
  defaultPollingMs?: number; // How often to fetch data
  fetchData?: (config) => Promise<TData>; // Server-side data fetch
  Widget: FC<TData>; // React component to render the widget
  clientSide?: boolean; // Widget handles its own fetching
};
```

**Why this pattern?**

- **Type Safety**: Each adapter defines its own `TData` type, ensuring the Widget receives exactly the data it expects
- **Encapsulation**: All service logic lives in one file (~50 lines average)
- **Extensibility**: Adding a new service requires only creating a single file and registering it
- **Testability**: Each adapter can be tested in isolation

**Registry System:**

```typescript
// src/lib/adapters/index.ts
function buildRegistry(definitions: unknown[]): ServiceRegistry {
  const registry: Record<string, ServiceDefinition> = {};
  for (const def of definitions as ServiceDefinition[]) {
    registry[def.id] = def;
  }
  return registry as ServiceRegistry;
}

export const registry = buildRegistry([
  radarrDefinition,
  sonarrDefinition,
  // ... 30+ adapters
]);
```

**Note on Type Assertion**: The `as ServiceRegistry` assertion is required due to TypeScript's contravariance for function types. `FC<TData>` is contravariant in `TData`, preventing direct assignment of `ServiceDefinition<RadarrData>` to `ServiceDefinition<ServiceData>`. This is safe because type safety is enforced at each adapter's definition site where `Widget: FC<TData>` must match the `TData` returned by `fetchData()`.

### 2. Data Flow

#### Server-Side Widget Data Fetching

```
User opens dashboard
        │
        ▼
┌──────────────────────────────────────────┐
│ src/app/page.tsx (Server Component)      │
│  - Fetches groups + items from DB        │
│  - Revalidates every 30 seconds          │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│ src/components/dashboard/dashboard.tsx   │
│  - Renders groups with optimistic UI    │
│  - DnD via @dnd-kit                     │
│  - useReducer for state management      │
└────────────┬─────────────────────────────┘
             │
             ▼ (for each widget)
┌──────────────────────────────────────────┐
│ Widget component (e.g., RadarrWidget)    │
│  - Calls server action via fetch()       │
│  - SWR handles polling + caching         │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│ src/actions/services.ts (Server Action)  │
│  1. Load item from DB                    │
│  2. Check cache (TTL-based)              │
│  3. Decrypt credentials (AES-256-GCM)    │
│  4. Call adapter.fetchData(config)       │
│  5. Cache result                         │
│  6. Return to widget                     │
└────────────┬─────────────────────────────┘
             │
             ▼
┌──────────────────────────────────────────┐
│ src/lib/adapters/radarr.tsx              │
│  - Fetches from Radarr API               │
│  - Returns typed data (RadarrData)       │
└──────────────────────────────────────────┘
```

#### Client-Side Widget Data Fetching

Some widgets (like DateTime, Search) handle their own data fetching:

```typescript
// src/lib/adapters/datetime.tsx
export const datetimeDefinition: ServiceDefinition<DateTimeData> = {
  id: "datetime",
  clientSide: true,  // Widget handles its own updates
  fetchData: (config) => {
    // Computed server-side for initial render
    return { timeZone: config.timeZone, timeZoneOffset: ... }
  },
  Widget: DateTimeWidget,  // Updates every second via setInterval
}
```

### 3. State Management

#### Dashboard State (useReducer)

The dashboard uses a reducer for drag-and-drop state management, eliminating the need for refs to work around stale closures:

```typescript
type GroupsAction =
  | { type: "SYNC"; groups: GroupWithItems[] }
  | { type: "DRAG_OVER"; activeId: string; overId: string }
  | { type: "DRAG_END_GROUP"; activeId: string; overId: string }
  | { type: "DRAG_END_ITEM"; activeId: string; overId: string }
  | { type: "ADD_ITEM"; groupId: string; item: ItemRow }
  | { type: "UPDATE_ITEM"; item: ItemRow }
  | { type: "DELETE_ITEM"; itemId: string }
  | { type: "ADD_GROUP"; group: GroupWithItems }
  | { type: "UPDATE_GROUP"; groupId: string; name: string }
  | { type: "DELETE_GROUP"; groupId: string }

function groupsReducer(
  state: GroupWithItems[],
  action: GroupsAction
): GroupWithItems[] { ... }
```

**Benefits over useState + useRef:**

- No stale closure issues - reducer always sees latest state via action
- Centralized state logic - easier to test and reason about
- No need for `sortedGroupsRef` pattern

#### Optimistic Updates

When a user creates/updates/deletes an item:

1. **Dispatch action** → UI updates immediately
2. **Call server action** → Persists to database in background
3. **Server revalidates** → Sends fresh data, syncs state

### 4. Caching Strategy

#### Server-Side Cache (src/lib/server-cache.ts)

Labitat uses a server-side cache backed by SQLite to ensure data persists across restarts and is immediately available for SSR.

**Cache Keys**: `itemId`  
**TTL**: Configurable per service (default 10s)  
**Implementation**: See `src/lib/server-cache.ts`

### 5. Security Architecture

#### Encryption Flow

```
User enters API key
        │
        ▼
┌──────────────────────┐
│  configEnc (JSON)    │
│  { apiKey: "..." }   │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  encrypt()            │
│  - HKDF-SHA256 key   │
│  - AES-256-GCM       │
│  - Random IV (12b)   │
└────────┬─────────────┘
         │
         ▼
┌──────────────────────┐
│  Base64 ciphertext   │
│  IV(12) + Ciphertext │
│  Stored in DB        │
└──────────────────────┘
```

**Key Derivation**: Uses HKDF-SHA256 to derive a 256-bit key from `SECRET_KEY`, properly extracting entropy rather than truncating.

**Entropy Validation**: `SECRET_KEY` must have ≥3.5 bits/character Shannon entropy, rejecting weak keys like `"aaaa..."`.

#### Rate Limiting

Rate limiting is implemented in `src/lib/auth/rate-limit.ts` to protect authentication endpoints. It uses a persistent SQLite-backed storage to track attempts across restarts.

### 6. Database Schema

```
┌──────────────┐       ┌──────────────┐
│   groups     │       │   settings   │
├──────────────┤       ├──────────────┤
│ id (PK)      │       │ key (PK)     │
│ name         │       │ value        │
│ order        │       └──────────────┘
│ created_at   │
└──────┬───────┘
       │
       │ 1:N
       │
┌──────▼───────┐
│    items     │
├──────────────┤
│ id (PK)      │
│ group_id FK  │
│ label        │
│ href         │
│ icon_url     │
│ service_type │  ← Adapter ID (e.g., "radarr")
│ service_url  │
│ config_enc   │  ← Encrypted JSON
│ order        │
│ polling_ms   │
│ clean_mode   │
└──────────────┘
```

**Engine**: SQLite via better-sqlite3 + Drizzle ORM  
**Migrations**: Drizzle Kit, stored in `drizzle/` and run on startup in Docker

## Key Files

| Path                                     | Purpose                                |
| ---------------------------------------- | -------------------------------------- |
| `src/lib/adapters/`                      | Service adapter definitions            |
| `src/lib/adapters/index.ts`              | Registry - add new adapters here       |
| `src/lib/adapters/types.ts`              | Core types for adapters                |
| `src/actions/services.ts`                | Server action for fetching widget data |
| `src/actions/auth.ts`                    | Login, setup, logout actions           |
| `src/actions/groups.ts`                  | CRUD for groups                        |
| `src/actions/items.ts`                   | CRUD for items                         |
| `src/components/dashboard/dashboard.tsx` | Main dashboard with DnD                |
| `src/lib/crypto.ts`                      | AES-256-GCM encryption with HKDF       |
| `src/lib/server-cache.ts`                | Server-side cache backed by SQLite     |
| `src/lib/auth/rate-limit.ts`             | Rate limiting with persistence         |
| `src/lib/db/schema.ts`                   | Drizzle schema definition              |
| `src/lib/env.ts`                         | Environment validation with Zod        |

## Adding a New Service

See [Adding a Service](../adding-a-service.md) for a step-by-step guide. In brief:

1. Run `pnpm new-service` to scaffold
2. Define `TData` type
3. Create `Widget` component
4. Implement `fetchData` (optional)
5. Define `configFields` for credentials
6. Register in `src/lib/adapters/index.ts`
7. Test and move from "disabled" to "active"
