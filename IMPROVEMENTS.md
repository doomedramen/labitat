# Suggested Improvements

A comprehensive codebase review organized by category and severity.

---

## Security

### CRITICAL: Unauthenticated Server Actions (SSRF + Credential Leak) — FIXED

**Files:** `src/actions/services.ts`, `src/actions/widget-data.ts`, `src/actions/ping.ts`

`fetchServiceData`, `getWidgetData`, `getBatchWidgetData`, `pingUrl`, and `pingAndCache` were all `"use server"` actions with **no `requireAuth()` call**. Any visitor could invoke these directly.

**Fix applied:** Added `requireAuth()` to all functions. URL validation was intentionally omitted for `pingUrl` since users need to ping internal/private addresses — the auth gate alone is sufficient.

---

### MEDIUM: No Middleware Auth Enforcement

**File:** `src/proxy.ts`

The middleware only handles the `/setup` redirect. After setup, all pages are served to anonymous users with no redirect to `/login`. Auth relies entirely on server actions calling `requireAuth()` and client-side UI hiding.

---

### MEDIUM: Deterministic Salt in Key Derivation

**File:** `src/lib/crypto.ts:23-25`

```ts
const salt = Buffer.from(secret.slice(0, SALT_LENGTH))
return scryptSync(secret, salt, KEY_LENGTH)
```

The salt is derived from the secret itself, making the derived key identical for a given `SECRET_KEY`. Should generate a random per-ciphertext salt and store it alongside the ciphertext (similar to how IV and authTag are already stored).

---

### MEDIUM: No Scrypt Work Factor Parameters

**File:** `src/lib/crypto.ts:25`

`scryptSync` uses Node.js defaults (N=16384, r=8, p=1), which are low by modern standards. Explicitly specify higher cost parameters (e.g., N=65536).

---

### MEDIUM: In-Memory Rate Limiter Resets on Deploy

**File:** `src/lib/auth/rate-limit.ts:11`

The rate limit store is entirely in-memory. Every restart, deploy, or HMR reload clears all state. Multi-instance deployments multiply the allowed attempts by the number of instances.

---

### LOW: Dummy Bcrypt Hash May Leak Timing

**File:** `src/actions/auth.ts:101-104`

The dummy hash `"$2b$12$invalidhashpadding..."` is malformed. Depending on the bcrypt implementation, this might throw or short-circuit differently than a valid hash, potentially leaking timing info. Use a real (randomly generated) bcrypt hash instead.

---

### LOW: Password Field Erased on Item Edit

**File:** `src/actions/items.ts:36-44, 100-136`

When editing an item, leaving a password field blank excludes it from the new config object, but `updateItem` always overwrites `configEnc` entirely. The stored password is silently erased rather than preserved.

---

### LOW: Silent Decryption Failure

**File:** `src/actions/items.ts:164-170`

If decryption fails (e.g., wrong `SECRET_KEY`), `getItemConfig` silently returns `{}`. The user gets no feedback that stored credentials are unrecoverable.

---

### LOW: Cache File Written with Default Permissions

**File:** `src/lib/cache.ts:60`

The cache file may contain decrypted service data but is written with default OS permissions (typically 0644), readable by any local user.

---

### LOW: Weak Password Policy

**File:** `src/actions/auth.ts:41`

6-character minimum with no complexity requirements. Given the admin account controls access to all service credentials, 12+ characters would be more appropriate.

---

## Architecture & Code Quality

### CRITICAL: `formatMediaTitle` Copy-Pasted Into 4 Adapters

**Files:** `src/lib/adapters/plex.tsx:46-76`, `jellyfin.tsx:22-52`, `emby.tsx:22-52`, `tautulli.tsx:22-52`

Identical function verbatim-copied across four files. The comment even says "Shared across Plex, Jellyfin, Emby, and Tautulli adapters" — but it's not actually shared. `buildStreamsTooltip` was correctly extracted to `src/lib/utils/format-media.tsx`, but `formatMediaTitle` was not.

---

### HIGH: Radarr/Sonarr `fetchData` Nearly Identical

**Files:** `src/lib/adapters/radarr.tsx:90-177`, `sonarr.tsx:118-221`

Same pattern: four parallel fetches, identical queue processing, identical progress/ETA logic. Only differs in API path (`/movie` vs `/series`) and label text. Should be a shared `*arr` base function.

---

### HIGH: Emby/Jellyfin `fetchData` Nearly Identical

**Files:** `src/lib/adapters/emby.tsx:139-231`, `jellyfin.tsx:139-237`

Virtually identical session-processing loop. Only differs in `Authorization` header construction. Should be a single function parameterized by auth header builder.

---

### HIGH: No API Response Validation

All 35+ adapters call `.json()` and access fields without validation. Example from `radarr.tsx:109-112`:

```ts
const queue = await queueRes.json()
```

A malformed API response produces silently incorrect widget data rather than a user-visible error. At minimum, add runtime checks for critical fields; consider Zod schemas for response validation.

---

### MEDIUM: Inconsistent Boolean Config Parsing

Two conventions exist:

```ts
// Convention A (default-false)
const show = config.showActiveDownloads === "true"

// Convention B (default-true)
const show = config.showDownloads !== "false"
```

Easy to confuse when copying between adapters. Should use a shared `parseBooleanConfig(value, defaultValue)` utility.

---

### MEDIUM: No Request Timeout on Adapters

**File:** Only `generic-ping.tsx:66` uses `AbortController`. All other adapters make bare `fetch()` calls with no timeout. A hanging backend service blocks the polling loop indefinitely.

---

### MEDIUM: `buildRegistry` Uses Unsafe `unknown[]` Cast

**File:** `src/lib/adapters/index.ts:80-86`

Accepts `unknown[]` and immediately casts to `ServiceDefinition[]`, bypassing all compile-time checking. A typo in a definition object won't be caught.

---

### MEDIUM: Auth Tokens Not Validated

**Files:** `portainer.tsx:99-100`, `proxmox.tsx:110`, `proxmox-backup-server.tsx:120`

If auth fails, `token` is `undefined` and subsequent requests send `Authorization: Bearer undefined` — a confusing 401/403 rather than a clear error.

---

### MEDIUM: Side-Effect Imports in Adapter Registry

**File:** `src/lib/adapters/index.ts:27-31`

Mutates imported objects at module scope. If import order changes or tree-shaking removes the import, the mutation is lost.

---

### LOW: Pi-hole v6 Silent Failure

**File:** `src/lib/adapters/pihole.tsx:83-94`

When session auth succeeds but the summary fetch fails, the adapter returns `_status: "ok"` with all zeros. User sees a "healthy" widget showing zero queries when the API actually failed.

---

### LOW: AdGuard Wraps Single Fetch in `Promise.all`

**File:** `src/lib/adapters/adguard.tsx:93-96`

`Promise.all` with a single element is unnecessary overhead. Leftover from a refactor.

---

### LOW: Emby/Jellyfin `toPayload` Redundant Mapping

**Files:** `emby.tsx:89-101`, `jellyfin.tsx:89-101`

Field-by-field mapping creates a shallow copy with identical shape. A simple assignment would be cleaner.

---

### LOW: Deprecated `apiKeyEnc` Column Still in Schema

**File:** `src/lib/db/schema.ts:36`

Should be removed with a migration plan.

---

### LOW: Duplicated `toStatCardOrder` / `parseStatCardOrder`

**Files:** `src/components/editor/item-dialog.tsx:164-176`, `src/components/dashboard/item/widget-renderer.tsx:12-24`

Identical validation functions defined in two places. Extract to a shared utility.

---

## Frontend

### HIGH: No Error Handling on Server Actions

**Files:** `dashboard.tsx`, `group.tsx`, `edit-mode-controls.tsx`, `item-dialog.tsx`, `group-dialog.tsx`

- `reorderGroups()`/`reorderItems()` called fire-and-forget — optimistic update never reverts on failure
- `deleteGroup()`/`deleteItem()` called without error handling — UI removes item even if server fails
- Dialog submit handlers have no try/catch — errors cause unhandled promise rejections
- No toast/notification on failure for any mutation

---

### HIGH: Widget Retry Button Non-Functional

**File:** `src/components/dashboard/item/widget-renderer.tsx:57-63`

Dispatches `CustomEvent("widget:retry")` but nothing in the codebase listens for it. The `useItemData` hook doesn't subscribe. The retry button does nothing.

---

### HIGH: Accessibility Issues

- **StatusDot** (`status-dot.tsx`): No `role`, `aria-label`, or screen reader text. Not keyboard-focusable. Color-only status fails WCAG 1.4.1.
- **ServiceCombobox** (`item-dialog.tsx:84-161`): Missing `role="combobox"`, `aria-expanded`, `aria-haspopup`, `aria-controls`. No `role="listbox"` on option list. No keyboard navigation (arrow keys, Enter, Escape).
- **Service Type label** (`item-dialog.tsx:405`): No `htmlFor` association with the combobox.
- **Clean mode cards** (`item-card.tsx:122-133`): Anchor with no text content — fails WCAG 2.4.4.
- **Buttons** missing `type="button"` in `dashboard.tsx:366` and `group.tsx:110`.

---

### MEDIUM: React Anti-Patterns & Unnecessary Re-Renders

- **Props-to-state sync** (`dashboard.tsx:74-77`): `useEffect` syncing `groups` into local state causes extra renders. Server data arriving mid-drag overwrites optimistic state.
- **Inline arrow functions** (`dashboard.tsx:335-348`): `onEditGroup`, `onAddItem`, `onEditItem` recreated every render, causing `GroupCard` re-renders. Wrap in `useCallback`.
- **Unnecessary `.flatMap` on every render** (`dashboard.tsx:83-90`): `activeItem`/`activeGroup` computed unconditionally. Add `useMemo`.
- **ServiceCombobox sorts on every render** (`item-dialog.tsx:58-59`): `[...services].sort()` creates new array each time. Memoize or compute once.
- **No `React.memo`** on `GroupCard` or `ItemCard` — parent re-renders cascade down.

---

### MEDIUM: Array Index as React Key

**File:** `src/components/widgets/index.tsx:605, 687`

`ActiveStreamList` and `DownloadList` use `key={idx}`. When items are added/removed/reordered, this causes incorrect DOM reconciliation. Use a stable identifier.

---

### MEDIUM: Service Worker Issues

**File:** `public/sw.js`

- Cache name hardcoded as `"labitat-v1"` — never auto-bumps on deploy
- JS/CSS cache regex `/\.(?:js|css)$/i` too broad — matches `sw.js` itself and API routes
- Precached `/~offline` references JS/CSS chunks that may not be cached
- No update notification — `skipWaiting()` fires without `controllerchange` listener

---

### LOW: No Loading States

- `handleSaveTitle` (`dashboard.tsx:202-208`): No loading indicator during async save
- `getItemConfig` (`item-dialog.tsx:270-300`): No loading state for config fields
- Title input constrained to `max-w-[200px]` (`dashboard.tsx:236`) — too narrow for long titles

---

### LOW: Dialog UX Issues

- No "Cancel" button in item/group dialogs — must click outside or press Escape
- Dialog state may persist when re-opening for the same item
- No keyboard shortcut for toggling edit mode

---

## Infrastructure & DevOps

### HIGH: Node.js Version Mismatch

- **Dockerfile:** `node:20-alpine`
- **CI (ci-cd.yml):** `node-version: '24'`
- **Deploy-docs:** `node-version: 22`

Three different Node versions across the pipeline. Pick one and standardize. The mismatch is especially risky for native modules like `better-sqlite3`.

---

### HIGH: Release Notes Bug

**File:** `.github/workflows/ci-cd.yml:192`

The heredoc uses single-quoted `'EOF'` which prevents command substitution. The `$(git log ...)` expression will appear literally in release notes as text.

---

### HIGH: `db:push` vs `db:migrate` Inconsistency

- **install.sh:106** uses `db:push` (schema push, can be destructive)
- **playwright.config.ts:27** uses `db:push`
- **docker-entrypoint.sh:22** uses migrations

These handle schema changes differently. `db:push` can be destructive for certain schema changes.

---

### MEDIUM: Non-Deterministic Tool Versions

- **Dockerfile:8:** `corepack prepare pnpm@latest` — different pnpm per build
- **ci-cd.yml:** `pnpm/action-setup` with `version: latest`
- **lefthook.yml:19:** `npx -y package-bump@latest` — downloads latest every commit
- **deploy-docs.yml:30:** `version: 10` for pnpm vs `latest` in ci-cd.yml

Pin all tool versions for reproducible builds.

---

### MEDIUM: Pre-Commit Hook Race Conditions

**File:** `lefthook.yml`

`parallel: true` runs lint, format, migration generation, and version bump concurrently. Both `generate-migration` and `version-bump` modify files, and `stage_fixed: true` can cause git staging conflicts.

---

### MEDIUM: Pre-Push Hook Runs E2E Tests + Build

**File:** `lefthook.yml:23, 28`

Running Playwright E2E tests and a full build on every push is very slow. Consider splitting so only unit tests run on push, with E2E + build in CI only.

---

### MEDIUM: Missing Database Indexes

**File:** `src/lib/db/schema.ts`

No indexes on `items.group_id` (used in JOINs), `users.email` (used for auth lookups), or other frequently queried columns.

---

### MEDIUM: Health Endpoint Is Superficial

The `/api/health` route returns `{ status: "ok" }` without checking database connectivity. Should verify the database is accessible.

---

### MEDIUM: Docker Compose `read_only: false`

**File:** `docker-compose.yml:33`

With `/data` as a named volume and `/tmp` as tmpfs, `read_only: true` should work. The comment says "Next.js standalone needs write access" but the write paths are already covered.

---

### MEDIUM: Install Script Security Concerns

**File:** `install.sh:64`

`curl | bash` for NodeSource setup is a security anti-pattern. No version pinning — always installs from `main`. `apt-get` output suppressed entirely.

---

### LOW: No `.dockerignore` for `docs/` and `tests/`

The `.dockerignore` doesn't exclude `docs/`, `tests/`, `coverage/`, or `install.sh`, adding unnecessary context size.

---

### LOW: Inconsistent Action Versions Between Workflows

**Files:** `ci-cd.yml` vs `deploy-docs.yml`

`actions/checkout`, `pnpm/action-setup`, and `actions/setup-node` use different major versions between the two workflow files.

---

### LOW: `drizzle.config.ts` Fallback Missing `file:` Prefix

**File:** `drizzle.config.ts:8`

Fallback `"./data/labitat.db"` doesn't include the `file:` prefix used everywhere else (`file:./data/labitat.db`).

---

### LOW: `order` Column Name is a SQL Reserved Word

**File:** `src/lib/db/schema.ts:38`

The column name `order` is a reserved SQL keyword. Works in SQLite with quoting but could cause issues if migrating to another database.

---

## Testing

### HIGH: Zero Server Action Tests

`src/actions/` contains 8 files handling all data mutations (auth, groups, items, settings, services) with no test coverage.

### HIGH: Zero Auth Logic Tests

`src/lib/auth/` (session, rate-limit, guard) is security-critical and untested.

### HIGH: Zero Hook Tests

`src/hooks/` (use-item-data, use-mobile, use-palette, use-stat-card-order) has no tests.

### HIGH: Zero Utility Tests

`src/lib/crypto.ts`, `src/lib/cache.ts`, `src/lib/db/index.ts`, `src/lib/utils/format.ts` — all untested.

---

### MEDIUM: Tests Don't Use Shared Mock Infrastructure

All adapter tests manually construct `vi.fn()` mocks while `tests/helpers/adapter-mocks.ts` provides `withMockAdapter()`. The mock system even includes a migration guide that hasn't been followed.

---

### MEDIUM: `vi.unstubAllGlobals()` Missing in afterEach

**Files:** All adapter test files

`vi.stubGlobal("fetch", ...)` is not cleaned up by `vi.restoreAllMocks()`. Tests need `vi.unstubAllGlobals()` in `afterEach` to prevent stub leakage.

---

### MEDIUM: No E2E Tests for Widget Rendering

The Playwright mock adapter infrastructure exists but is unused. No E2E tests verify that service widgets render, poll, or display errors correctly — the core feature of the app.

---

### MEDIUM: Missing Edge Case Coverage in Adapter Tests

- Network errors / timeouts (fetch throws TypeError)
- Malformed JSON responses
- Rate limiting / 429 responses
- Partial failures in parallel requests (e.g., Radarr's 4 concurrent fetches)
- Empty/missing config fields
- Boundary values (0 bytes, negative numbers)

---

### LOW: Non-Deterministic Mock Data

**File:** `tests/helpers/mocks/specialized-adapters.ts`

`Math.random()` used in Emby and Matrix mocks causes intermittent test failures.

---

### LOW: Prowlarr Mock Structure Mismatch

The unit test (`prowlarr.test.tsx`) expects a different API contract than the shared mock infrastructure (`tests/helpers/mocks/arr-adapters.ts`).

---

### LOW: `baseUrl` Ignored in Mock URL Matching

Multiple mock functions accept `baseUrl` but use `urlPatterns.contains("/api")` regardless, causing potential false matches in multi-service tests.

---

## Dependency & Configuration

### MEDIUM: Both `uuid` and `nanoid`

**File:** `package.json`

Both packages serve the same purpose (unique ID generation). `nanoid` is already used throughout — `uuid` appears unused and can be removed.

### MEDIUM: No `engines` Field

**File:** `package.json`

Without an `engines` field, there's no enforcement of Node.js version compatibility.

### MEDIUM: Next.js Pinned to Exact Version

**File:** `package.json:57`

`next: "16.1.7"` (no caret) means `pnpm update` never picks up patches. May be intentional but worth noting.

### LOW: Version at `0.0.261`

261 patch versions suggest the versioning strategy may need rethinking. Consider using minor versions for feature releases.

---

## Quick Wins (High Impact, Low Effort)

1. Add `requireAuth()` to `services.ts`, `widget-data.ts`, `ping.ts`
2. Extract `formatMediaTitle` to shared utility
3. Add `vi.unstubAllGlobals()` to test setup
4. Fix release notes heredoc (remove quotes from `'EOF'`)
5. Standardize Node.js version across Dockerfile and CI
6. Pin `pnpm@latest` and `package-bump@latest` to specific versions
7. Fix widget retry event listener
8. Add `type="button"` to non-submit buttons
9. Add database indexes for `items.group_id` and `users.email`
10. Remove `uuid` dependency (use `nanoid` exclusively)
