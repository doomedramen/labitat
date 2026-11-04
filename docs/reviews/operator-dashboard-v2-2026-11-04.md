# Compact operator dashboard v2 — 4 November 2026

Implemented the approved dashboard plan. The landing page now uses compact service tiles, with separate launch and inspection actions, service-level health filters, search, persistent detail URLs, and staged arrangement.

| Before                                                               | After                                                                                          |
| -------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------- |
| Tall cards mixed metrics, activity, descriptions, and status footers | Consistent 96px tiles with at most four metrics; 136px mobile tiles with a 2×2 metric layout   |
| Investigation changed card geometry                                  | 440px side panel or full-screen mobile sheet, restored through the URL and browser history     |
| Dummy editor saved moves immediately                                 | Real live tiles, local drafts, atomic Save, Cancel, and structural conflict detection          |
| Formatted values were unsuitable for history                         | Serializable metrics, native numeric observations, canonical units, and 24-hour minute samples |
| Page-data responses could replay old configuration after a save      | Network-only application data and a service-worker cache-version reset                         |

Existing credentials, URLs, groups, configuration, selections, and metric IDs remain intact. Explicit selections after the fourth slot remain available in details and numeric history. New metrics stay in Unused. Additive migration `drizzle/0008_operator_dashboard.sql` creates history tables and structural revisions; history starts empty.

Collection starts once at Node startup through instrumentation and reuses the existing concurrency-limited scheduler. Background intervals respect the greater of the configured interval and 60 seconds. Failed or cached observations never become new numeric samples. Unit/configuration changes, failures, and downtime leave honest gaps. Identical repeated failures do not create duplicate incidents.

Local date/time, the search utility, and the dedicated Glances chart/process renderers work in details. Decorative renderers mount only during inspection. Arrange and configuration failures retain their drafts and support recovery; configuration loading retains the existing protection against obsolete asynchronous results.

## Verification

Validated on Next.js 16.2.3 with Node 22.23.4 and isolated test databases:

- Unit suite: **889 tests, 96 files passed**.
- Complete production Playwright suite: **82 passed**, with **6 pre-existing disabled cases**. The suite builds the production app before running. A separate capture check verifies the final 1440 × 900 and 320px screenshots against that production build.
- Production build, TypeScript, lint, and formatting: passed.
- Adapter validation: **53 adapters**; documentation coverage: **53/53**.
- VitePress documentation build and dead-link checks: passed.
- Real SQLite tests cover sampling limits, zero values, gaps, unit/configuration partitioning, selected extras, transition deduplication, persisted state reload, retention boundaries, atomic cross-group layout saves, and concurrent structural edits.
- History UI tests cover visible-only minute refresh, unmount cancellation, range changes, and obsolete responses. Startup tests cover build/edge guards and duplicate initialization.
- The 100-service render regression verifies that inspection does not render every tile. Scheduler tests verify background collection and a single polling loop.
- Browser coverage includes both themes, 24 services in three groups without desktop scrolling, 320px mobile, a 200% zoom-equivalent CSS viewport, reduced motion, long labels, large values, missing data, empty groups, independent launch/details, Back/Forward/refresh/focus restoration, filters/search, all-hidden metrics, explicit selections above four, metric dragging, Arrange cancellation/retry/conflicts, and Glances/date/time/search capabilities.

Only isolated test databases were reset or seeded. No production database migration or deployment was performed. The migration is required before starting the upgraded deployment. The implementation assumes one always-on Node instance and the existing SQLite deployment model.

See the [operator dashboard guide](../operator-dashboard.md) for behavior and deployment details. The README includes the final synthetic 24-service fixture screenshot.
