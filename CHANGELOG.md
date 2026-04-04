# Changelog

All notable changes to this project will be documented in this file.

The format is based on [Keep a Changelog](https://keepachangelog.com/en/1.1.0/),
and this project adheres to [Semantic Versioning](https://semver.org/spec/v2.0.0.html).

## [Unreleased]

### Added

- HSTS header (`Strict-Transport-Security`) with `max-age=31536000; includeSubDomains; preload`
- Site-wide Content-Security-Policy (report-only mode)
- `SECURITY.md` at repo root for GitHub Security tab
- `CODE_OF_CONDUCT.md` (Contributor Covenant v2.1)
- Database migration runner (`scripts/migrate.js`) — runs on container startup
- Health check now verifies database connectivity (returns 503 if unreachable)
- Setup redirect: `/` redirects to `/setup` when no admin exists

### Changed

- `drizzle-kit` moved from `dependencies` to `devDependencies`
- `hasAdminUser()` extracted to `lib/db/admin.ts` for use in proxy context
- `proxy.ts` now handles setup redirect logic (Next.js 15.3+ naming)

### Removed

- `drizzle.docker.config.mjs` (replaced by `scripts/migrate.js`)

---

## [0.0.52] - 2026-04-04

### Added

- Initial pre-launch version

[Unreleased]: https://github.com/DoomedRamen/labitat/compare/v0.0.52...HEAD
[0.0.52]: https://github.com/DoomedRamen/labitat/releases/tag/v0.0.52
