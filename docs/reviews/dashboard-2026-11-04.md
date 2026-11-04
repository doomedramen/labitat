# Dashboard remediation — 4 November 2026

The supplied screenshot and repository were reviewed together. Application changes address the reported layout, density, themes, editing, metric defaults, and misleading cache freshness. The deployed homelab services were not accessed.

| Before                                                                                                  | After                                                                                                          | Why                                                                 |
| ------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------- |
| Cards followed their content height; active lists enlarged selected cards                               | Equal grid rows, shared minimum card height, expandable activity                                               | Keeps the dashboard aligned and the default view scannable          |
| Repeated group counts, edit metadata, and expanded download details                                     | Fewer repeated labels; activity on demand                                                                      | More useful information per glance                                  |
| Seventeen palettes, competing overrides, and a dark variant targeting an unused class                   | Two maintained themes, shared surface/text/status/chart roles, dark styles keyed to the actual theme attribute | Consistent contrast and room for meaningful accent and data colours |
| Every metric could become visible by default; new metrics were automatically active                     | Four defaults maximum, shared layout normalization, new metrics in Unused                                      | Extra metrics appear only after an explicit user choice             |
| Glances overview and per-CPU bypassed metric controls                                                   | Both use the standard metric system                                                                            | A machine with many cores no longer overwhelms its card             |
| Drag-only controls and no active drop target when all metrics were hidden                               | Show/Hide/reorder buttons, drag handles, empty Shown drop target, reset                                        | Recovery and keyboard operation do not depend on dragging           |
| Opening/saving a dialog could inject untouched configuration defaults and invalidate useful cached data | Preserve saved and explicitly edited fields; omitted fields retain their values                                | A metric or label change does not silently alter the connection     |
| Slow loads could overwrite another draft; saving was available before credentials loaded                | Session-scoped loads, cancellation, retry, pending/error states                                                | Protects drafts and stored configuration                            |
| Blur validation moved the next control during its click                                                 | Validation at submission                                                                                       | Fixes the reproduced Appearance/icon selection failure              |
| Delete confirmations closed before completion                                                           | Wait for success; disable repeated activation; retain failures for retry                                       | A failed deletion stays recoverable                                 |
| Cache writes and failed attempts looked like fresh data                                                 | Persist separate attempt/success metadata; show successful-data age and stale state                            | Repeated failures cannot make old values appear newly fetched       |
| New SSE clients received only future updates                                                            | Subscribe before polling, replay the latest observations with original timestamps                              | Resuming/reconnecting catches up immediately                        |
| Late responses could overwrite a changed service or newer request                                       | Check configuration revision and request ordering                                                              | Old endpoint results cannot repopulate a new configuration          |
| Insecure HTTPS cleared its hard-deadline timer before the request completed                             | Retain the timer and destroy the request on expiry                                                             | A stalled request cannot occupy a polling slot indefinitely         |
| Initial live-connection failures had no banner; every card owned an age timer                           | Announce initial connection failure; share a clock paused while hidden                                         | Honest connection feedback with fewer timers                        |

Explicit saved selections above four remain supported. Reset to defaults is persisted. Earlier theme cookies retain their light/dark intent. Legacy cached records retain their values and have an unknown successful-update time until a successful live observation occurs.

## Additional findings still open

These are source-confirmed routing/behaviour gaps, outside the repaired metric and editing paths. They need their own widget acceptance tests before being called fixed.

- **High: incomplete custom-widget routing.** [WidgetRenderer](../../src/components/dashboard/item/widget-renderer.tsx) excludes client-side `renderWidget` implementations, while [Date & Time](../../src/lib/adapters/datetime.tsx) uses that path. The [Glances timeseries](../../src/lib/adapters/glances-timeseries.tsx) and [processes](../../src/lib/adapters/glances-processes.tsx) adapter renderers return `null`; the current renderer does not select their dedicated widget components. These widgets can produce empty cards.
- **Medium: Search is not a usable search input.** [SearchWidget](../../src/lib/adapters/search.tsx) sends every engine name to a Google query. It has no query field and does not use the selected engine's destination.
- **Tooling: runtime versions are not reproducible on this machine.** The default Node 26 had no working SQLite native module, and the installed pnpm rejected the repository's legacy manifest settings. Browser validation used the installed Node 22 and rebuilt SQLite locally. The adapter CLI also needs a CSS import shim because the registry imports CSS modules. Dependency manifests and the lockfile were not upgraded.

## Deployment and evidence

The additive [cache metadata migration](../../drizzle/0007_cache_provenance.sql) must be applied with the project's normal migration process when deploying this version. Only the isolated test database was reset or seeded during this work. An in-memory SQLite check verified that the migration preserves old cached values and leaves successful-update time unknown.

Final validation used Next.js 16.2.3 and Node 22.23.4:

- `node_modules/.bin/oxlint`: 0 warnings, 0 errors.
- `node_modules/.bin/tsc --noEmit`: passed.
- `node_modules/.bin/vitest run`: 88 files, **863 tests passed**.
- Production Playwright matrix on port **3134**: **54 tests passed**. Files: `auth`, `dashboard-density`, `dashboard-title`, `drag-drop`, `edit-mode`, `mobile`, `navigation`, `offline`, `palette`, `stat-cards`, and `theme`. The matrix built the production app before starting the isolated server. A temporary config used the installed local binaries in place of pnpm commands; it was removed after validation.
- Adapter registry: **53 validated** with a temporary CSS import shim for the CLI.
- `node scripts/check-doc-coverage.mjs`: **53/53** documented.
- `git diff --check` and formatting checks: passed.
- New regression cases were observed failing before their fixes: default metric limits, implicit metric activation, all-hidden layouts, failed-cache freshness, initial cache loading, stream replay, configuration load races, duplicate/pending saves, deletion recovery, untouched configuration defaults, cross-generation success history, HTTPS deadlines, API caching in the worker, and the reconnect-banner delay.

Browser acceptance covered full edit/save/view/back/forward flows, cancelled and failed moves, metric dragging in both directions, saved ordering, all-hidden restoration, explicit selections above four, theme persistence, 320px layout, keyboard status disclosure, one-hour-old successful data following a recent failure, and failed first connection feedback. The two previously skipped metric dragging/persistence cases are now enabled and passing.

Screenshots were inspected in dark, light, and mobile layouts. Reproducible test outputs are `test-results/dashboard-dark.png`, `dashboard-light.png`, and `dashboard-mobile.png`. Copies for this review are saved in the Codex visualization folder as `labitat-dark.png`, `labitat-light.png`, and `labitat-mobile.png`.

No deployment or production database migration was performed during validation.
