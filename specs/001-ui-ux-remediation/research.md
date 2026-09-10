# Research and decisions

**Date**: 2026-09-10. Inputs: 26 source-review tickets, prior direct live-store probes, current source, installed Next.js 16.2.3 documentation, and focused Luna research. This is planning research, not a completed runtime diagnosis.

## R1 — Separate route data from live data

**Decision**: Reproduce the user flow and reconcile both server-rendered structure and live-store state. Apply consistent mutation invalidation after successful writes.

**Rationale**: `src/actions/groups.ts` lacks the route invalidation present in item actions. `src/lib/live-store.ts` ignores same-key snapshots and clears subscriptions on key changes. Neither proves the full browser symptom. Installed `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md` documents revalidation after mutations; `03-api-reference/04-functions/refresh.md` limits server refresh to Server Actions and distinguishes it from tagged-data invalidation.

**Alternatives considered**: Hard reload is the symptom workaround, not the solution. Replacing the store on every render can overwrite newer live observations. Blanket cache disabling does not reconcile an external browser store.

## R2 — Polling must describe observations and scheduling separately

**Decision**: Track last attempt, last success, in-flight state, scheduled next attempt, and server time independently. Keep success time persisted and scheduler state volatile. Treat the next attempt as scheduling information rather than a promise.

**Rationale**: `src/lib/polling-supervisor.ts` schedules from attempt start and limits concurrent requests. `src/app/api/events/route.ts` currently stamps cache notifications with delivery time. `src/lib/server-cache.ts` updates lastFetchedAt on every write, including failure-with-cached-data writes. The current timestamp cannot prove data freshness.

**Alternatives considered**: Computing next poll from browser receipt time misses queue/idle/slow-request effects. Reinterpreting updatedAt as last success would assign false precision to legacy rows. A full event-history database is unnecessary for the requested indicator.

## R3 — Use shared clock updates, measure before optimizing

**Decision**: One visible-page clock with second-level text updates; static reduced-motion indicators. Profile a fixed 100-card fixture before and after.

**Rationale**: `src/hooks/use-sync-progress.ts` runs a React state update loop per card. The UI only needs human-readable time accuracy, not display-rate text changes.

**Alternatives considered**: Keeping per-card requestAnimationFrame loops is unnecessary for this small indicator. A CSS animation can supplement the shared clock but must be resynchronized and disabled when motion is reduced.

## R4 — Preserve editing as a recoverable operation

**Decision**: Track async loading/submitting/dirty states explicitly; serialize conflicting arrangement saves and perform cross-group moves transactionally.

**Rationale**: The current editor optimistically moves items before drop and submits source/destination changes separately. Dirty dialogs reset on dismissal; title failures are swallowed before navigation. A single operation boundary makes success and rollback meaningful.

**Alternatives considered**: Toasts alone cannot restore drafts or reconcile persisted data. A global Save All redesign would change the product's immediate-save model and is not required.

## R5 — Use existing accessibility primitives and explicit actions

**Decision**: Repair picker/focus semantics, expose touch/keyboard status disclosure, and add explicit metric move/show/hide actions alongside dragging.

**Rationale**: Current dnd-kit/Radix dependencies already cover most interaction needs; the stat editor has only a pointer sensor and no empty active target. Explicit actions also help users who can click but cannot drag.

**Alternatives considered**: Replacing the component library increases scope. Keyboard dragging alone leaves touch users who cannot drag without an alternative.

## R6 — Resolve design proposals without changing the product direction

**Decision**: Use a grouped basic/connection/advanced service form, preserve the current visual style, and implement Search as a query plus supported engine choice.

**Rationale**: These are reasonable defaults within tickets 017 and 020. They remove ambiguity without requiring a product-wide redesign.

**Alternatives considered**: Renaming Search to shortcuts would be smaller but would not deliver an actual search flow. Keep that option documented as a fallback only if the implementation discovers incompatible existing configuration.

## R7 — Establish a safe browser test environment first

**Decision**: Make Playwright server port and test base URL agree on an explicit isolated port and disable reuse of arbitrary existing servers for regression runs. Confirm test DB and mock service configuration before resetting.

**Rationale**: `playwright.config.ts` hardcodes port 3000 and permits server reuse outside CI. Port 3000 was occupied by an unrelated process during review. Existing reset/seed fixtures must never target the user's dashboard.

**Alternatives considered**: Killing the port occupant or using the user's dashboard for destructive tests is unnecessary. A separate test port and DB keep the loop deterministic.

## Remaining empirical work

The chosen design has no unanswered product-scope questions. Implementation must still reproduce the exact hard-refresh sequence, establish browser subscription lifecycle behavior, check adapter success/warning semantics, and profile 100 cards. Those are explicit foundational/story tasks with pass/fail evidence, not claims that research already proved them.

## R8 — Focused polling research conclusions

Read-only research by gpt-5.6-luna confirmed that lastPolledAt is overloaded by staggering, the SSE subscription is currently registered after polling is started, and scheduler state is process-local. Implementation must split actual attempt time from scheduled due time, subscribe before starting the supervisor, and seed connection state before relying on subsequent events.

**Decision**: Preserve the existing start-anchored cadence. If multiple server processes cannot provide one authoritative scheduler, show unknown/estimated timing; adding distributed scheduling is outside scope. Persist separate success time instead of redefining historical updatedAt values. Retain legacy fetchedAt as an observation timestamp and add explicit lastSuccessAt rather than silently changing old payload semantics.

**Rationale**: Some adapters catch transport failures and return error payloads rather than throwing. Others return degraded but fresh data. The implementation must inspect these cases and introduce an explicit normalized freshness outcome where necessary. A resolved promise alone is not evidence of fresh values; a warning alone is not evidence of stale values. T004/T016 make this classification an explicit tested seam.

**Alternatives considered**: Treating every resolved promise as a new success would retain the reviewed freshness defect. Treating every warning as failure would mislabel fresh degraded observations. Reusing the cache write timestamp as verified success would misrepresent legacy rows. The plan chooses additive fields and bounded adapter normalization instead.
