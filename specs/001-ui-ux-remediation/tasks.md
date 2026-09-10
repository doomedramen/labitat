# Tasks: UI/UX remediation

**Input**: [plan.md](plan.md), [spec.md](spec.md), [research.md](research.md), [data-model.md](data-model.md), and [contracts](contracts/).

**Tests**: Explicitly scoped in the specification. Behavioral regression tests precede fixes where listed. Copy-only changes use inspection.

**Status**: All tasks pending. No application implementation was performed by the planning agent.

**Execution**: Use gpt-5.6-luna only. Serial execution is the default; do not spawn agents from this checklist without authorization. Paths are repository-relative. Create named test files if absent. Read [handoff.md](handoff.md) first.

## Phase 1: Setup

**Goal / checkpoint**: Establish isolated, reproducible tooling before touching application behavior.

- [x] T001 Make Playwright accept LABITAT_E2E_PORT consistently for baseURL/server command/server URL, reject arbitrary server reuse, and retain the isolated test DB in playwright.config.ts; document dev/production invocation in specs/001-ui-ux-remediation/quickstart.md.
- [x] T002 Read AGENTS.md and installed Next.js mutation/cache guides; run relevant existing baseline checks and record versions, failures, test DB/port verification, and the 100-card profile procedure in specs/001-ui-ux-remediation/validation.md.

## Phase 2: Foundational baseline

**Goal / checkpoint**: Separate the reported symptom from source suspicions; keep evidence runnable.

- [ ] T003 Add a controlled edit/save/Done/back-forward reproduction matrix to tests/e2e/edit-mode.spec.ts and tests/e2e/navigation.spec.ts; cover group/item/title/config/order/membership without page.reload, and record which cases fail in specs/001-ui-ux-remediation/validation.md. (Tickets 025.)
- [ ] T004 Extend deterministic service fixtures in tests/helpers/mocks/ for slow, failed, fresh-degraded, queued, and legacy-cache observations; document fixture identities and safe server setup in specs/001-ui-ux-remediation/validation.md. Inspect adapter outcome meanings before changing freshness semantics. (Tickets 022, 023.)

## Phase 3: US1 — Immediate persistence and recovery

**Goal / checkpoint**: Save/Done/back reflects canonical state without reload; surviving cards update; failed/cancelled moves and title saves retain recoverable state.

- [ ] T005 [US1] Add failing snapshot/membership regression coverage in src/lib/live-store.test.ts and src/components/dashboard/live-provider.test.tsx for same-ID refresh, older snapshots, changed configuration, surviving subscriptions, and current hydration snapshots. (Tickets 025, 026.)
- [ ] T006 [US1] Add failure/cancellation and pending-Done cases in tests/e2e/drag-drop.spec.ts and tests/e2e/dashboard-title.spec.ts; assert state preservation rather than only toast visibility. (Tickets 013, 014, 015.)
- [ ] T007 [US1] Unify successful mutation invalidation for both view/edit routes in src/actions/groups.ts, src/actions/items.ts, and src/actions/settings.ts; choose the minimal installed-Next.js-supported policy proven by T003. (Tickets 025.)
- [ ] T008 [US1] Introduce nonsecret configuration generation and snapshot reconciliation in src/lib/db/schema.ts, drizzle/, src/actions/items.ts, src/lib/live-types.ts, src/lib/live-store.ts, src/components/dashboard/live-provider.tsx, src/app/page.tsx, and src/app/edit/page.tsx; preserve newer same-generation observations and existing subscribers, reject old-generation data, and retain compatible legacy defaults. (Tickets 025, 026.)
- [ ] T009 [US1] Capture pre-drag state and handle onDragCancel in src/components/dashboard/dashboard-client.tsx and src/components/dashboard/edit-mode.tsx; clear overlays and restore layout on Escape or cancelled drops. (Tickets 013.)
- [ ] T010 [US1] Make cross-group move persistence atomic in src/actions/items.ts and serialize layout mutations in src/components/dashboard/dashboard-client.tsx; handle every failure and restore the correct pre-move arrangement without overwriting a newer success. (Tickets 014.)
- [ ] T011 [US1] Expose title validation/pending/failure in src/components/dashboard/title-form.tsx, src/components/dashboard/dashboard-client.tsx, and src/components/dashboard/edit-bar.tsx; await outstanding mutations and navigate only after successful saves. (Tickets 015.)
- [ ] T012 [US1] Run US1 regression in dev and production, document evidence in specs/001-ui-ux-remediation/validation.md, and verify T003 through T011 before closing tickets 013, 014, 015, 025, and 026. (Tickets 013, 014, 015, 025, 026.)

## Phase 4: US2 — Trustworthy polling and status

**Goal / checkpoint**: Last success survives failures/restart; scheduled/queued/polling/disconnected states are honest and operable without hover.

- [ ] T013 [US2] Add clock-controlled timing/cache tests in src/lib/polling-supervisor.test.ts and src/lib/server-cache.test.ts for attempt start, actual due time, stagger/idle behavior, returned transport errors, fresh degraded results, repeated failure, and persistence reload. (Tickets 022, 023.)
- [ ] T014 [US2] Add legacy/new payload and connection-start ordering tests in src/components/dashboard/live-provider.test.tsx and src/lib/live-store.test.ts, plus an API stream test adjacent to src/app/api/events/route.ts; reproduce initial connection failure and resume with fixtures. (Tickets 009, 022, 023.)
- [ ] T015 [US2] Separate real attempt time from staggered scheduling in src/lib/polling-supervisor.ts; retain start-anchored cadence, emit queued/polling/scheduled changes, and fence obsolete configuration results using the US1 generation. (Tickets 022.)
- [ ] T016 [US2] Normalize fresh-data versus failed-attempt provenance at src/lib/polling-supervisor.ts and src/lib/adapters/types.tsx; update only adapters whose returned failures cannot be distinguished safely, preserving fresh degraded data semantics and documenting cases in specs/001-ui-ux-remediation/research.md. (Tickets 023.)
- [ ] T017 [US2] Persist nullable attempt/success/observation metadata in src/lib/db/schema.ts, drizzle/, and src/lib/server-cache.ts; preserve cached values and last success on failures, read legacy records as unknown, and test restart behavior. (Tickets 023.)
- [ ] T018 [US2] Extend src/lib/live-types.ts, src/app/api/events/route.ts, src/lib/live-store.ts, src/app/page.tsx, and src/app/edit/page.tsx with contracts/live-state.md metadata; register listeners before starting polls, send initial state, accept legacy events, and avoid resetting connection state during snapshot reconciliation. (Tickets 022, 023.)
- [ ] T019 [US2] Replace hover-only details with a keyboard/touch disclosure in src/components/dashboard/item/status-dot/index.tsx and status-dot-client.tsx; adjust src/components/dashboard/item/item-card.tsx so status sits outside the launch anchor; expose last success/attempt/schedule and visible failure/stale labels. (Tickets 008, 022, 023.)
- [ ] T020 [US2] Replace per-card animation-frame state updates in src/hooks/use-sync-progress.ts with a shared visible-page clock, preserve server-time alignment, and update relative-age text in src/components/dashboard/item/item-live-view.tsx; make reduced-motion state static. (Tickets 023, 024.)
- [ ] T021 [US2] Show delayed first-connection failure and reconnecting announcements in src/components/dashboard/sse-banner.tsx and src/components/dashboard/live-provider.tsx; invalidate schedule confidence immediately on disconnect/reconnect signal. (Tickets 009.)
- [ ] T022 [US2] Run tests/e2e/status-pill.spec.ts and tests/e2e/offline.spec.ts with slow/queued/failure/resume fixtures, keyboard/tap disclosure, clock skew, and 100-card before/after profile; record US2 evidence in specs/001-ui-ux-remediation/validation.md. (Tickets 008, 009, 022, 023, 024.)

## Phase 5: US3 — Predictable metric customization

**Goal / checkpoint**: Saved order/presentation matches view; all metrics can be hidden and restored without dragging.

- [ ] T023 [US3] Add meaningful metric-layout behavior coverage in tests/e2e/stat-cards.spec.ts and src/components/editor/item-dialog.preview.test.tsx for saved order, mode, all-hidden restore, keyboard actions, and obsolete/new metric IDs. (Tickets 010, 011, 012.)
- [ ] T024 [US3] Share layout normalization between src/hooks/use-stat-card-order.ts, src/components/widgets/widget-container.tsx, src/components/dashboard/item/editable-stat-grid.tsx, and src/components/dashboard/item/widget-stat-grid.tsx; preserve explicit ordering and deterministic defaults. (Tickets 012.)
- [ ] T025 [US3] Honor icon/label mode and valueClassName in src/components/dashboard/item/widget-stat-grid.tsx and src/components/dashboard/item/stat-card.tsx; keep labels accessible and preview/view consistent. (Tickets 012.)
- [ ] T026 [US3] Add explicit move/show/hide actions, meaningful labels, keyboard behavior, and an empty active drop zone in src/components/dashboard/item/editable-stat-grid.tsx; retain pointer dragging as an optional shortcut. (Tickets 010, 011.)
- [ ] T027 [US3] Verify US3 pointer, keyboard, touch, and persistence scenarios from tests/e2e/stat-cards.spec.ts and record evidence in specs/001-ui-ux-remediation/validation.md before closing tickets 010–012. (Tickets 010, 011, 012.)

## Phase 6: US4 — Reliable configuration and forms

**Goal / checkpoint**: Keyboard users can configure and recover; stale loads and duplicate saves cannot corrupt the draft.

- [ ] T028 [US4] Add delayed/rejected/superseded loading, duplicate-save, dirty-dismissal, and picker-focus tests beside src/components/editor/item-dialog.tsx and src/components/editor/group-dialog.tsx, reusing existing preview tests and mocks. (Tickets 003, 004, 005, 006.)
- [ ] T029 [US4] Correct eight-character setup guidance in src/app/setup/setup-form.tsx and inspect it against server validation in src/actions/auth.ts; do not add a test solely for the wording change. (Tickets 001.)
- [ ] T030 [US4] Associate labels/help/errors and implement failed-submit focus/announcement in src/components/auth/login-form.tsx, src/app/setup/setup-form.tsx, src/components/editor/group-dialog.tsx, and src/components/editor/item-dialog.tsx; include IDs on dynamic select triggers. (Tickets 002.)
- [ ] T031 [US4] Separate configuration load state from editable draft in src/components/editor/item-dialog.tsx; scope loads to item/service/open generation, ignore obsolete results, expose retry, and gate saving until configuration is ready. (Tickets 003.)
- [ ] T032 [US4] Implement pending/error retention for create/update/delete in src/components/editor/group-dialog.tsx, src/components/editor/item-dialog.tsx, src/components/confirm-dialog-client.tsx, and their dashboard callers; disable repeated activation and wait for asynchronous outcome before closing. (Tickets 004.)
- [ ] T033 [US4] Add dirty-baseline tracking and explicit discard behavior to src/components/editor/item-dialog.tsx and src/components/editor/group-dialog.tsx, including Escape, outside click, close, Cancel, and pending-save handling. (Tickets 005.)
- [ ] T034 [US4] Repair ServiceCombobox in src/components/editor/item-dialog.tsx with option IDs/active-descendant or a complete equivalent focus model, uniform link-only option handling, scoped Escape, and trigger focus restoration. (Tickets 006.)
- [ ] T035 [US4] Run tests/e2e/setup.spec.ts, tests/e2e/auth.spec.ts, editor component tests, and keyboard/screen-reader recovery checks; record US4 outcomes in specs/001-ui-ux-remediation/validation.md. (Tickets 001, 002, 003, 004, 005, 006.)

## Phase 7: US5 — Mobile clarity and reduced motion

**Goal / checkpoint**: At narrow widths/zoom and with software keyboard, controls remain reachable and motion preference is respected.

- [ ] T036 [US5] Increase coarse-pointer hit areas and action readability in src/components/ui/button.tsx, src/components/dashboard/header.tsx, src/components/dashboard/group-dummy.tsx, and src/components/dashboard/item/item-card-dummy.tsx; verify neighboring targets do not overlap. (Tickets 007.)
- [ ] T037 [US5] Correct edit instructions and immediate-save guidance in src/components/dashboard/edit-bar.tsx and src/components/dashboard/item/item-card-dummy.tsx; provide mobile-visible guidance matching actual Edit controls. (Tickets 016.)
- [ ] T038 [US5] Restructure src/components/editor/item-dialog.tsx into identity/launch, connection, and advanced settings while preserving the US4 draft lifecycle; keep actions reachable with safe areas and software keyboard and clarify the two URL roles. (Tickets 017.)
- [ ] T039 [US5] Apply reduced-motion behavior in src/app/globals.css, src/lib/adapters/matrix.tsx, src/lib/adapters/pipes.tsx, src/components/widgets/glances-timeseries-widget.tsx, and src/hooks/use-sync-progress.ts; stop nonessential loops without removing content. (Tickets 018.)
- [ ] T040 [US5] Extend tests/e2e/mobile.spec.ts and perform 320px/390px/desktop, 200% zoom, software-keyboard, light/dark, and reduced-motion acceptance; record screenshots and US5 evidence in specs/001-ui-ux-remediation/validation.md. (Tickets 007, 016, 017, 018.)

## Phase 8: US6 — Useful widget interactions

**Goal / checkpoint**: Widget controls act independently; search uses the selected engine and charts expose when data occurred.

- [ ] T041 [US6] Add Search destination/encoding and independent-card-action coverage in src/lib/adapters/search.test.tsx and tests/e2e/widgets.spec.ts, plus chart timestamp/range checks beside src/components/widgets/glances-timeseries-widget.tsx. (Tickets 019, 020, 021.)
- [ ] T042 [US6] Finish separating service launch anchors from all interactive widget content in src/components/dashboard/item/item-card.tsx; preserve external-link behavior and keyboard focus for existing widgets, coordinating with the US2 status trigger. (Tickets 021.)
- [ ] T043 [US6] Implement labeled query and engine choice in src/lib/adapters/search.tsx with Google/DuckDuckGo/Bing URL encoding, empty-query guidance, and explicit unknown legacy-name fallback; preserve recognized saved engine order. (Tickets 020.)
- [ ] T044 [US6] Expose chart time window, point timestamp/timezone, and readable summary in src/components/widgets/glances-timeseries-widget.tsx without regressing US5 reduced motion. (Tickets 019.)
- [ ] T045 [US6] Verify independent link/status/search keyboard and touch actions and chart context in tests/e2e/widgets.spec.ts; record US6 acceptance and legacy config checks in specs/001-ui-ux-remediation/validation.md. (Tickets 019, 020, 021.)

## Phase 9: Integration and closeout

**Goal / checkpoint**: All tickets have verified dispositions; no silent gaps or false completion.

- [ ] T046 Run the full regression and required repository gates from specs/001-ui-ux-remediation/quickstart.md; record exact commands/results and any unresolved failure in specs/001-ui-ux-remediation/validation.md.
- [ ] T047 Update affected guides under docs/ and verify every row in specs/001-ui-ux-remediation/ticket-map.md against acceptance evidence; use the project ticket-transition workflow to close only verified tickets in tickets/open/.
- [ ] T048 Review the final diff for unintended data/config/style changes, remove temporary instrumentation, and commit/push logical increments without co-author attribution; record final commit IDs and remaining limitations in specs/001-ui-ux-remediation/validation.md.

## Dependencies & execution order

Setup precedes foundational baseline. Complete both before fixing behavior. Within a story, proceed in listed order; tests written together may run independently, but implementation still follows its contract dependencies.

- US1 depends on the baseline and is the first delivery milestone.
- US2 depends on US1 snapshot/configuration generation and card lifecycle.
- US3 and US4 depend on US1 persistence; recommended serial order is US2, US3, US4 because shared files are involved.
- US5 depends on US2 status/motion, US3 metric interaction, and US4 form lifecycle.
- US6 depends on US2 card/status separation and preserves US5 motion changes.
- Final integration follows all six stories. Failed validation keeps the affected ticket open.

No task has a [P] marker: this handoff is optimized for one implementation agent and intentionally avoids concurrent writes to shared files.

## Potential parallel examples (only if later authorized)

- US1: store unit tests and browser reproduction authoring use different files; do not run multiple browser servers on the same port/database.
- US2: cache unit coverage and status UI fixture review can proceed independently after the live contract is fixed; stream/schema changes remain serial.
- US3: keyboard acceptance design and stat rendering inspection can run separately; changes to the shared normalization remain serial.
- US4: setup copy inspection can proceed independently from async item-load test authoring; all ItemDialog edits stay under one owner.
- US5: mobile hit-area measurement and reduced-motion canvas inspection are independent; shared component edits stay serial.
- US6: chart work and Search work use distinct files after card-action separation, but browser fixture runs still share an isolated server.

These are scheduling opportunities, not instructions to delegate. If multiple agents are explicitly authorized later, assign disjoint ownership and require gpt-5.6-luna.

## Implementation strategy

Deliver US1 first and validate without hard refresh. Then deliver US2 to address the second explicit user concern. Commit and push each verified story or smaller coherent slice; avoid one large final commit. Continue through every story, preserving earlier acceptance checks. Close tickets using evidence, not task completion counts. If an original report cannot be reproduced, record the precise tested scenarios and keep its disposition explicit rather than silently claiming a fix.
