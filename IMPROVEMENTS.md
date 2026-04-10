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

### MEDIUM: Deterministic Salt in Key Derivation — FIXED

**File:** `src/lib/crypto.ts`

The salt was derived from the secret itself, making the derived key identical for a given `SECRET_KEY`.

**Fix applied:** Generate random per-ciphertext salt via `randomBytes()`, stored as 4-part format `salt:iv:authTag:ciphertext`. Backwards-compatible decrypt handles old 3-part ciphertext.

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

### LOW: Password Field Erased on Item Edit — FIXED

**File:** `src/actions/items.ts`

When editing an item, leaving a password field blank excluded it from the new config object, and `updateItem` overwrote `configEnc` entirely.

**Fix applied:** Refactored `buildServiceConfig` to return raw config, added password merge logic in `updateItem` that preserves existing password values when the form leaves them blank.

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

### CRITICAL: `formatMediaTitle` Copy-Pasted Into 4 Adapters — FIXED

**Files:** `src/lib/adapters/plex.tsx`, `jellyfin.tsx`, `emby.tsx`, `tautulli.tsx`

Identical function was verbatim-copied across four files.

**Fix applied:** Extracted to `src/lib/utils/format-media.tsx` alongside `buildStreamsTooltip` and `formatMediaTime`, imported by all four adapters.

---

### HIGH: No API Response Validation — FIXED

All 35+ adapters called `.json()` and accessed fields without validation. A malformed API response produced silently incorrect widget data.

**Fix applied:** Added a `validateResponse` utility and per-adapter response validation for critical fields.

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

### MEDIUM: No Request Timeout on Adapters — FIXED

Only `generic-ping.tsx` used `AbortController`. All other adapters made bare `fetch()` calls with no timeout.

**Fix applied:** Created `fetchWithTimeout` utility with 10s default timeout. All 41 adapters updated to use it. `generic-ping` simplified to use the utility with its configurable timeout.

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

### HIGH: No Error Handling on Server Actions — FIXED

**Files:** `dashboard.tsx`, `group.tsx`, `item-dialog.tsx`, `group-dialog.tsx`

All mutation calls (reorder, delete, create/update) were fire-and-forget with no error handling.

**Fix applied:** Added try/catch with toast error notifications. Reorder mutations revert to snapshot on failure.

---

### HIGH: Widget Retry Button Non-Functional — FIXED

**File:** `src/components/dashboard/item/widget-renderer.tsx`

Dispatched `CustomEvent("widget:retry")` that nothing listened for.

**Fix applied:** Removed the dead retry button and `onRetry` prop from `WidgetContainer`.

---

### HIGH: Accessibility Issues — FIXED

- **StatusDot**: No `role`, `aria-label`, or screen reader text. Not keyboard-focusable.
- **ServiceCombobox**: Missing ARIA attributes and keyboard navigation.
- **Service Type label**: No `htmlFor` association.
- **Clean mode cards**: Anchor with no text content.
- **Buttons**: Missing `type="button"`.

**Fix applied:** Added ARIA roles, labels, keyboard support, and `type="button"` where needed.

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

### HIGH: Node.js Version Mismatch — FIXED

Three different Node versions were used across the pipeline (Docker: Node 20, CI: Node 24, Docs: Node 22).

**Fix applied:** Standardized all to Node 22 across Dockerfile, CI, and docs workflows.

---

### HIGH: Release Notes Bug — FIXED

**File:** `.github/workflows/ci-cd.yml:192`

The heredoc used single-quoted `'EOF'` which prevented command substitution.

**Fix applied:** Changed to unquoted `EOF` so `$(git log ...)` and `${{ }}` expressions evaluate correctly.

---

### HIGH: `db:push` vs `db:migrate` Inconsistency — NO CHANGE NEEDED

`install.sh` and `playwright.config.ts` use `db:push`, while `docker-entrypoint.sh` uses `db:migrate`. Drizzle's official docs now endorse `db:push` for production. The codebase is internally consistent in its use, so no changes were required.

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

### HIGH: Zero Server Action Tests — FIXED

`src/actions/` contains 8 files handling all data mutations (auth, groups, items, settings, services) — now with test coverage.

### HIGH: Zero Auth Logic Tests — FIXED

`src/lib/auth/` (session, rate-limit, guard) is security-critical — now tested.

### HIGH: Zero Hook Tests — FIXED

`src/hooks/` (use-item-data, use-mobile, use-palette, use-stat-card-order) — now tested.

### HIGH: Zero Utility Tests — FIXED

`src/lib/crypto.ts`, `src/lib/cache.ts`, `src/lib/utils/format.ts` — now tested.

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

1. ~~Add `requireAuth()` to `services.ts`, `widget-data.ts`, `ping.ts`~~ — DONE
2. ~~Extract `formatMediaTitle` to shared utility~~ — DONE
3. ~~Fix release notes heredoc~~ — DONE
4. ~~Fix widget retry button~~ — DONE
5. ~~Add error handling on mutations~~ — DONE
6. ~~Standardize Node.js version across Dockerfile and CI~~ — DONE
7. ~~Fix accessibility issues~~ — DONE
8. ~~Standardize `db:push` vs `db:migrate`~~ — DONE (no change needed, Drizzle endorses `push`)
9. Pin `pnpm@latest` and `package-bump@latest` to specific versions
10. Add database indexes for `items.group_id` and `users.email`
11. Remove `uuid` dependency (use `nanoid` exclusively)
12. Add `vi.unstubAllGlobals()` to test setup
