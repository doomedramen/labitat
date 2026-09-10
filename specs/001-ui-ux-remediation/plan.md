# Implementation Plan: UI/UX remediation

**Branch**: `main` (planning artifacts only) | **Date**: 2026-09-10 | **Spec**: [spec.md](spec.md)

**Input**: All 26 open review tickets. [Execution checklist](tasks.md) and [ticket coverage](ticket-map.md).

## Summary

Deliver six independently verifiable increments. Start with visible persistence and live-store reconciliation, then correct polling metadata before redesigning its indicator. Follow with metric customization, robust forms, mobile/reduced-motion presentation, and widget behavior. Keep the existing grouped dashboard design.

The hard-refresh report is user evidence; its exact browser cause remains unconfirmed. Reproduce it before selecting a route-cache fix. Same-key snapshot rejection and subscriber clearing have been observed directly in the store. Saved stat order/icon mode is a separate rendering issue that a refresh cannot solve.

## Technical Context

**Language/Version**: TypeScript 5.9, React 19.2, Next.js 16.2.3; Node 22+ (local Node 24).

**Primary Dependencies**: Tailwind 4, Radix/shadcn primitives, TanStack Form, dnd-kit, Sonner, Recharts. Reuse these; no new application framework or state library is planned.

**Storage**: SQLite through Drizzle/better-sqlite3; persisted widget cache plus in-process polling supervisor and browser live store.

**Testing**: Vitest, Testing Library, Playwright with isolated seeded database and mock adapters. Manual mobile/touch, focus, screen-reader, and reduced-motion checks supplement automation.

**Target Platform**: Self-hosted server; desktop browsers, mobile Safari/Chromium, installed PWA.

**Project Type**: Existing Next.js application, not a greenfield feature.

**Performance Goals**: Remove per-card animation-frame state updates for timing, update visible relative times at most once per second, pause unnecessary hidden-page timing work, and compare a controlled 100-card profile before/after. No unmeasured performance claims.

**Constraints**: Preserve existing dashboards, credentials, permissions, and legacy cache readability. Do not let stale metadata imply successful polling. Never run reset/seed against the user's database or reuse an unknown server on port 3000.

**Scale/Scope**: 26 tickets, six user stories, view/edit/setup flows and shared widgets. Existing 46 adapters must retain contract compatibility. No new adapter integrations.

## Constitution Check

Pre-research: PASS. Scope is planning only; tickets remain open. Existing stack, local Next.js documentation, and repository gates are used. Research delegation uses only gpt-5.6-luna.

Post-design: PASS. Changes are incremental; data-format evolution is additive; failure-state tests target real behavior; no application changes are included in this planning commit. The installed Spec Kit helper reports the feature name as BRANCH, while actual Git branch remains main; feature directory selection is explicit in `.specify/feature.json`.

## Project Structure

### Documentation (this feature)

```text
specs/001-ui-ux-remediation/
├── spec.md
├── plan.md
├── research.md
├── data-model.md
├── quickstart.md
├── ticket-map.md
├── tasks.md
├── contracts/
│   ├── live-state.md
│   └── editor-and-widgets.md
└── checklists/
    ├── requirements.md
    └── consistency.md
```

### Source Code (repository root)

```text
src/actions/                         # dashboard mutations
src/app/page.tsx                     # view snapshot
src/app/edit/page.tsx                # editor snapshot
src/app/api/events/route.ts          # live event stream
src/components/dashboard/           # editor, live store consumers, status, metrics
src/components/editor/              # service/group forms and pickers
src/components/widgets/             # chart and shared widget rendering
src/components/ui/                   # existing accessible primitives
src/hooks/                          # polling clock and preferences
src/lib/                            # cache, polling, live contracts
src/lib/db/schema.ts                # additive cache metadata if persisted
src/lib/adapters/                   # Search and decorative widget behavior
src/app/globals.css                  # global motion rules
tests/e2e/                           # browser scenarios
```

**Structure Decision**: Extend current modules. Extract only narrow shared seams: dashboard invalidation, live snapshot reconciliation, poll metadata normalization, and non-drag metric actions. Do not introduce a second general state manager.

## Delivery sequence

| Increment   | Scope                                                              | Tickets                 | Dependency                    | Exit checkpoint                                                           |
| ----------- | ------------------------------------------------------------------ | ----------------------- | ----------------------------- | ------------------------------------------------------------------------- |
| Foundation  | Isolated reproduction environment and mutation/live-state baseline | Supports all            | None                          | Dev and production fixture runs cannot touch real data                    |
| US1         | Immediate persistence and recovery                                 | 025, 026, 013, 014, 015 | Foundation                    | Save/Done/back works without reload; failed/cancelled moves restore state |
| US2         | Truthful health and polling                                        | 008, 009, 022, 023, 024 | US1 live reconciliation       | Success/attempt/schedule are distinct; status accessible without hover    |
| US3         | Metric layout                                                      | 010, 011, 012           | US1 persistence               | Saved layout matches view; all-hidden state recoverable                   |
| US4         | Configuration reliability                                          | 001–006                 | US1 mutation lifecycle        | Async loads, errors, dismissal, and picker work by keyboard               |
| US5         | Mobile and motion                                                  | 007, 016, 017, 018      | US2–US4 interaction contracts | Mobile actions reachable, instructions accurate, reduced motion respected |
| US6         | Chart/search/link behavior                                         | 019, 020, 021           | US2 card/status structure     | Independent actions and meaningful chart/search outcomes                  |
| Final audit | Cross-story acceptance and documentation                           | All                     | All stories                   | Every ticket has evidence or an explicit unresolved disposition           |

This is the recommended serial execution order, not a requirement to bundle everything into one release. US1 is the first useful delivery; US1+US2 address the user's two explicit concerns. Each story can be demonstrated with controlled fixtures once its listed shared dependency is ready.

## Implementation approach

### US1: persistence before presentation

Build browser repro cases that visit view, edit an existing item/group, save, choose Done, and navigate back/forward without page.reload. Include add/delete membership, title, service config, ordering, and delayed failures. Confirm whether the stale thing is structural props, live data, or stat rendering.

Use one consistent post-mutation invalidation policy for view and edit routes after successful DB writes; follow the installed Next.js mutating-data guide. Do not add refresh calls everywhere or assume dynamic rendering alone resolves browser state. Serialize conflicting operations, wait for pending layout mutations before Done, and return failures rather than navigating away after a swallowed error.

Reconcile snapshots by membership and per-item data/config identity rather than treating the list of IDs as data version. Preserve listeners for surviving items and update the server snapshot ref. Ignore older same-configuration observations; invalidate data from a changed service configuration. Ensure late data from an old poll cannot overwrite new configuration. Keep version/fingerprint metadata free of secrets.

Use a pre-drag snapshot for cancellation and failures. Prefer one transactional move action updating both source and destination ordering, validated against authenticated membership. Avoid rollback of newer successful edits by serializing layout operations while pending.

### US2: model first, indicator second

Define attempt, success, scheduled next attempt, and active request state at the supervisor/cache boundary. Persist success time separately from cache write time. Introduce backward-compatible metadata; legacy values have unknown success time until verified. Poll health must follow adapter outcome semantics rather than assuming every resolved promise is a success.

Emit server time and scheduler state. Display scheduled attempts as estimates when queueing or disconnection makes them uncertain. Refresh scheduled state when interval, idle/resume, or configuration changes. Keep stale values available with an explicit stale label.

Then replace hover-only status with a focusable/tappable disclosure outside any service anchor. Use a restrained ring for scheduled progress and text for last success, last attempt, next attempt, and failures. One shared visible-page clock supplies timing; reduced motion uses static state. Initial connection failure receives the same delayed notice as reconnecting.

### US3: one metric-layout interpretation

Normalize active/unused IDs once, exclude duplicates and missing metrics, and define new-metric defaults. Use the same normalized result in preview and view. Preserve icon/label preference with accessible labels. Add visible show/hide and move actions; keep drag as an optional shortcut and support an empty active zone.

### US4: robust form lifecycle

Keep server configuration loading separate from editable draft and submission state. Scope requests to current item/service/open generation; ignore stale responses and provide retry. Track dirty state after defaults have loaded. Add one recoverable pending/error model to create/update/delete/title actions; no close or navigation until outcome is known.

Associate labels, help, and errors; focus errors only on failed submit rather than every keystroke. Fix setup wording by inspection. Correct combobox active descendant, option IDs, Escape propagation, and focus restoration using current primitives where possible.

### US5: form hierarchy and mobile reach

Retain recognizable labels and configured values. Group basic identity/launch settings, service connection, and advanced polling/stat settings. Keep actions reachable within safe-area and software-keyboard constraints; avoid nested scrolling traps. Enlarge coarse-pointer hit areas without making dense desktop cards unnecessarily tall. Update instructions to match the actual Edit button and immediate-save behavior. Cover CSS, canvas, chart, and polling motion preferences.

### US6: useful widgets

Remove whole-content anchor nesting before adding Search controls. Use a labeled query field and engine selector; encode query parameters with URL APIs and preserve recognized existing engine configuration. Explicitly handle unknown legacy entries rather than silently searching Google for their names. Add chart time range, timezone-aware timestamp tooltip, and concise textual summary.

## Validation and completion

See [quickstart.md](quickstart.md) for runnable checks and expected outcomes. Each story ends with a small commit or reviewable set of commits and its targeted regression evidence. Run required hooks before pushing; never bypass them. Only mark a ticket complete when its acceptance scenario passes, not when an associated source file changes. Record unreproduced reports as unresolved rather than calling the program finished.

## Complexity Tracking

No constitution exceptions. Additive cache metadata may require a Drizzle migration; this is justified by preserving last-success time across restarts. Volatile scheduler state is not persisted. A manual refresh button, full redesign, new auth flows, and broad adapter refactors are outside scope.
