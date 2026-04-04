# Labitat — Pre-Launch Improvement Plan

> Last updated: 4 April 2026
> Status: Planned — 27 items across 5 phases

---

## Phase 0: Critical Bug Fixes (Pre-Launch Blockers)

### 25. Fix Setup Redirection & Proxy
- **Problem**: `proxy.ts` doesn't redirect `/` to `/setup` when no admin exists.
- **Action**:
  - Implement a `hasAdminUser()` check in `proxy.ts`.
  - Redirect all requests to `/setup` if no admin exists (except for `/api` and static assets).
  - Ensure `/setup` redirects to `/` if an admin *does* exist.

### 26. Automate Docker Database Initialization
- **Problem**: Docker image doesn't initialize the SQLite database on startup, leading to crashes on first visit.
- **Action**:
  - Update `docker-entrypoint.sh` to run `pnpm db:push` (or migrations) before starting the server.
  - Ensure `drizzle-kit` or a lightweight migration runner is available in the production environment if needed, or use a custom script.

### 27. Enhance Health Check API
- **Problem**: `/api/health` only returns `{ status: "ok" }` and doesn't verify database connectivity.
- **Action**:
  - Update `app/api/health/route.ts` to perform a simple query (e.g., `db.select().from(users).limit(1)`) to verify DB health.
  - Return appropriate status codes (503) if the database is unreachable.

---

## Phase 1: Security & Compliance

### 1. Add HSTS Header
- Add `Strict-Transport-Security` header to `next.config.mjs`
- Set appropriate `max-age` (recommend 31536000 for production)
- Consider `includeSubDomains` and `preload` directives
- Update `docs/security.md` to document it

### 2. Add CODE_OF_CONDUCT.md
- Create file at repo root
- Use Contributor Covenant or similar standard template
- Reference it in CONTRIBUTING.md (already done)
- Link from README.md

### 3. Add CHANGELOG.md
- Decide on approach: auto-generated via tooling vs. manually curated
- Options: `auto-changelog`, `conventional-changelog`, or GitHub's release notes
- Add script to `package.json` for regenerating
- Backfill from existing git history/tags

### 4. Create install.sh Script
- Debian/Proxmox native installer
- Should handle: Node.js install, pnpm install, dependencies, systemd service setup
- Include uninstall option
- Test on clean Debian/Ubuntu VM
- Add to CI workflow for validation

### 5. Add SECURITY.md (repo root)
- Create at repo root for GitHub Security tab
- Can symlink or duplicate content from `docs/security.md`
- Include vulnerability disclosure process
- Link to `docs/security.md` for full details

### 6. Fix CSP Header
- Currently only applies to `/sw.js` — needs site-wide policy
- Determine what sources are actually needed (scripts, styles, images, connect-src)
- Balance security with functionality (PWA, external APIs, etc.)
- Test thoroughly — CSP breakage is a common source of bugs
- Consider using `report-only` mode initially

### 7. Address Disabled/Untested Adapters
- **Problem**: 17 adapters commented out in `lib/adapters/index.ts` (Jellyfin, Lidarr, Pi-hole, Portainer, Traefik, Grafana, Home Assistant, etc.)
- **Impact**: README claims support for these but they're non-functional
- **Options**:
  - Test and enable them
  - Remove from README's supported list
  - Mark as "experimental" or "community-maintained"
- **Files to update**: `lib/adapters/index.ts`, README, `docs/services/`

### 8. Add E2E Tests to CI Pipeline
- Tests exist in `tests/` but CI only runs lint/typecheck/build
- Add `pnpm test` to `ci-cd.yml` workflow
- Consider: run tests on PRs, not on main branch pushes
- May need test database setup in CI environment

### 9. Fix Copyright Year Inconsistency *(Trivial / Low Priority)*
- LICENSE file says 2024
- Docs footer says 2026
- Standardize across all files

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
| Week 1 | **Phase 0 (Blockers)** | **25, 26, 27** |
| Week 1 | Phase 1 (Security) | 1, 5, 6, 9, 2, 3 |
| Week 2 | Phase 1 (Critical) | 7, 8, 4 |
| Week 3 | Phase 2 (Community) | 10, 11, 14, 13 |
| Week 4 | Phase 3 (Testing) | 15, 16, 18 |
| Week 5 | Phase 4 (Docs & Polish) | 19, 20, 21, 22, 24 |
| Ongoing | External dependencies | 12, 17, 23 |

---

## Notes

- **Item 25 (Setup redirect)** — `proxy.ts` is the correct file name (Next.js 15.3+). Needs `hasAdminUser()` logic added.
- **Item 7 (Disabled adapters)** — Critical for launch. Decide: test & enable, or remove from README.
- **Item 8 (E2E tests in CI)** — Tests exist, just need CI integration.
- **Item 17 (Multi-browser testing)** is deferred due to DB wipe conflicts between parallel browser workers. Will revisit after unit test infrastructure is in place.
- **Item 16 (t3-env)** — Use `@t3-oss/env-core` (not `env-nextjs`). All env vars are server-side only; no `NEXT_PUBLIC_` exposure needed.
- **Item 4 (install.sh)** — requires testing on clean VM; may take longer than estimated.
- **Item 12 (Screenshots)** and **Item 23 (Demo)** — require visual assets or hosting setup.
- **Item 19 (Telemetry)** — ✅ Completed. `NEXT_TELEMETRY_DISABLED=1` already set in Dockerfile.
- **Item 9 (Copyright year)** — Trivial/low priority.
