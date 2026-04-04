# Labitat — Pre-Launch Improvement Plan

> Last updated: 4 April 2026
> Status: Phase 0 & Phase 1 complete — Phase 2 in progress

---

## Phase 0: Critical Bug Fixes (Pre-Launch Blockers) ✅

### 25. Fix Setup Redirection & Proxy ✅
- Extracted `hasAdminUser()` to `lib/db/admin.ts` (plain module, usable in proxy context)
- `proxy.ts` redirects `/` → `/setup` when no admin exists, skips API/static paths
- `/setup` redirects to `/` if admin exists and is logged in

### 26. Automate Docker Database Initialization ✅
- Created `scripts/migrate.js` using `drizzle-orm`'s built-in `migrator`
- `docker-entrypoint.sh` runs migrations before starting the server
- Moved `drizzle-kit` from `dependencies` → `devDependencies`
- Deleted dead file `drizzle.docker.config.mjs`

### 27. Enhance Health Check API ✅
- `app/api/health/route.ts` queries the `users` table to verify DB connectivity
- Returns 503 with error message if database is unreachable

---

## Phase 1: Security & Compliance ✅

### 1. Add HSTS Header ✅
- Added `Strict-Transport-Security: max-age=31536000; includeSubDomains; preload` to `next.config.mjs`

### 2. Add CODE_OF_CONDUCT.md ✅
- Created with Contributor Covenant v2.1
- Linked from `CONTRIBUTING.md`

### 3. Add CHANGELOG.md ✅
- Installed `auto-changelog` as devDependency
- Added `pnpm changelog` script for regeneration
- Backfilled initial changelog with recent changes

### 4. Create install.sh Script ✅
- Debian/Ubuntu/Proxmox native installer
- Handles: Node.js install, pnpm, git clone, build, systemd service setup
- Includes uninstall option with `--uninstall` flag
- Generates `SECRET_KEY` automatically
- Security hardening in systemd unit (NoNewPrivileges, ProtectSystem, etc.)

### 5. Add SECURITY.md (repo root) ✅
- Created at repo root for GitHub Security tab
- Includes vulnerability disclosure process
- Links to `docs/security.md` for full details

### 6. Fix CSP Header ✅
- Added site-wide `Content-Security-Policy-Report-Only` header
- Covers: scripts, styles, images, fonts, connect-src
- Report-only mode initially to catch breakage without blocking

### 7. Address Disabled/Untested Adapters ✅
- Split README into "Supported" (tested) and "Experimental" (untested) sections
- Updated feature count to "20+ services (30+ with experimental adapters)"
- Documented how to enable experimental adapters in `lib/adapters/index.ts`

### 8. Add E2E Tests to CI Pipeline ✅
- Added `e2e` job to `ci-cd.yml`
- Installs Playwright with Chromium dependencies
- Docker build now depends on both `test` and `e2e` jobs

### 9. Fix Copyright Year Inconsistency ✅
- Updated LICENSE from 2024 → 2026 (docs footer was already correct)

---

## Phase 2: Community & Onboarding

### 10. Add Issue/PR Templates
- `.github/ISSUE_TEMPLATE/bug_report.md` — with reproduction steps, environment info
- `.github/ISSUE_TEMPLATE/feature_request.md` — use case, proposed solution
- `.github/ISSUE_TEMPLATE/service_adapter.md` — for new service requests
- `.github/PULL_REQUEST_TEMPLATE.md` — already documented in CONTRIBUTING.md, move to template
- `.github/ISSUE_TEMPLATE/config.yml` — blank issue option, link to docs

### 11. Add README Badges
- CI status badge (from existing workflow)
- Version badge
- License badge
- Docker pulls badge (from GHCR)
- Consider: Code coverage, last commit, contributors
- Place at top of README.md

### 12. Create Demo/Screenshot Gallery
- Capture screenshots of: dashboard, settings, service widgets, mobile view, PWA install
- Add to `docs/public/images/`
- Create gallery page in VitePress docs
- Consider: short video/GIF demo
- Add screenshots to README

### 13. Add docker-compose.prod.yml with HTTPS
- Example with Traefik reverse proxy
- Example with Nginx Proxy Manager
- Include SSL/Let's Encrypt configuration
- Document in `docs/installation/docker.md`

### 14. Optimize Lefthook Pre-commit Hooks
- Move `typecheck` to pre-push only (it's slow)
- Keep `lint` and `format` on pre-commit but use `--fix` to auto-correct
- Consider: lint-staged for faster incremental runs
- Add `--quiet` flags to reduce noise

---

## Phase 3: Testing & Quality

### 15. Add Unit Tests
- Set up Vitest or Jest (Vitest recommended for Next.js)
- Target areas:
  - `lib/adapters/` — fetchData functions, config validation
  - `lib/utils/` — utility functions
  - `hooks/` — custom React hooks
  - `actions/` — server actions
- Aim for meaningful coverage, not a percentage target
- Add `pnpm test:unit` script

### 16. Add t3-env for Environment Validation
- Install `@t3-oss/env-core` (not `env-nextjs` — all env vars are server-side only, no `NEXT_PUBLIC_` vars needed)
- Define schema for: `SECRET_KEY`, `DATABASE_URL`, `NODE_ENV`, `PORT`, `CACHE_DIR`
- Validate at startup (import early in server entry point)
- Provide clear error messages for missing/invalid vars
- Remove manual validation scattered across codebase (`lib/session.ts`, `lib/crypto.ts`, `lib/db/index.ts`, `lib/cache.ts`)

### 17. Enable Multi-browser Testing (Deferred)
- **Blocker**: Database needs wiping between test runs
- **Approach**: Use separate DB files per worker/browser
- Or: Use Playwright fixtures to reset DB before each project
- Consider: Run browsers sequentially to avoid DB conflicts
- Defer until after unit test infrastructure is in place

### 18. Add Rate Limiting to Login
- Protect against brute-force attacks on login form
- Options: `@upstash/ratelimit`, `next-rate-limit`, or custom middleware
- Consider: IP-based + account-based limits
- Add to `docs/security.md`

---

## Phase 4: Documentation & Polish

### 19. ~~Add Next.js Telemetry Documentation~~ ✅ *Completed*
- Next.js telemetry is already disabled in Dockerfile (`NEXT_TELEMETRY_DISABLED=1`)
- Document how to opt-out in `docs/configuration.md` or new privacy section

### 20. Conduct Accessibility Audit
- Run axe DevTools or Lighthouse accessibility audit
- Check: color contrast, keyboard navigation, screen reader compatibility
- Add `aria-*` attributes where missing
- Ensure focus management works (modals, dialogs, navigation)
- Add `eslint-plugin-jsx-a11y` if not already present
- Document accessibility statement

### 21. Add Performance Benchmarks
- Document: startup time, memory usage, CPU usage, DB size growth
- Test on: Raspberry Pi, low-end VPS, modern hardware
- Add `docs/performance.md`
- Include: widget polling impact, PWA offline behavior
- Consider: adding a `/api/health` endpoint with resource metrics

### 22. Create Migration/Upgrade Guide
- Document upgrade paths between versions
- Database migration process (`drizzle-kit migrate`)
- Backup/restore procedure
- Breaking changes documentation
- Add to `docs/` and link from README

### 23. Add Demo Environment Link
- Set up public demo instance (can be read-only)
- Add demo link to README hero section
- Consider: demo credentials, reset schedule
- If no demo yet: add "Coming Soon" placeholder

### 24. Remove Console.log Statements from Production Code
- Files with console.log: `lib/cache.ts`, `public/sw.ts`, `components/service-worker-registrar.tsx`, `actions/services.ts`
- Replace with proper logging library or remove entirely
- Consider: `pino`, `winston`, or Next.js built-in logging
- Ensure no sensitive data leaks via logs

---

## Suggested Execution Order

| Week | Phase | Items |
|------|-------|-------|
| ~~Week 1~~ | **~~Phase 0 (Blockers)~~** | **~~25, 26, 27~~** ✅ |
| ~~Week 1~~ | **~~Phase 1 (Security)~~** | **~~1, 5, 6, 9, 2, 3~~** ✅ |
| ~~Week 2~~ | **~~Phase 1 (Critical)~~** | **~~7, 8, 4~~** ✅ |
| Week 3 | Phase 2 (Community) | 10, 11, 14, 13 |
| Week 4 | Phase 3 (Testing) | 15, 16, 18 |
| Week 5 | Phase 4 (Docs & Polish) | 19, 20, 21, 22, 24 |
| Ongoing | External dependencies | 12, 17, 23 |

---

## Notes

- **Item 7 (Disabled adapters)** — Marked as "experimental" in README. Users can enable by uncommenting in `lib/adapters/index.ts`.
- **Item 8 (E2E tests in CI)** — Added as separate job, runs on all PRs and pushes.
- **Item 17 (Multi-browser testing)** is deferred due to DB wipe conflicts between parallel browser workers. Will revisit after unit test infrastructure is in place.
- **Item 16 (t3-env)** — Use `@t3-oss/env-core` (not `env-nextjs`). All env vars are server-side only; no `NEXT_PUBLIC_` exposure needed.
- **Item 4 (install.sh)** — Created. Requires testing on clean VM before release.
- **Item 12 (Screenshots)** and **Item 23 (Demo)** — require visual assets or hosting setup.
- **Item 19 (Telemetry)** — ✅ Completed. `NEXT_TELEMETRY_DISABLED=1` already set in Dockerfile.
- **Item 9 (Copyright year)** — ✅ Completed.
- **Phase 0** — ✅ All items (25, 26, 27) completed. Docker build verified.
- **Phase 1** — ✅ All items (1-9) completed.
