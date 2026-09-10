# UI/UX remediation validation

## T001–T002 baseline

Date: 2026-09-10

- Feature preflight: `SPECIFY_FEATURE_DIRECTORY=specs/001-ui-ux-remediation .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks` passed and selected `/Users/martin/Developer/labitat/specs/001-ui-ux-remediation` with `tasks.md`.
- No checklist directory exists under the feature directory.
- Next.js guides read before code changes: `node_modules/next/dist/docs/01-app/01-getting-started/07-mutating-data.md`, `03-api-reference/04-functions/refresh.md`, `revalidatePath.md`, `revalidateTag.md`, and `updateTag.md`.
- Environment: Node `v24.14.0`, pnpm `9.15.9`; Next `16.2.3` from the lockfile/package manifest.
- Test isolation: Playwright now uses `LABITAT_E2E_PORT` for base URL, server URL, command, and `PORT`; default test port is `3100`; existing server reuse is disabled; database is `data/labitat.test.db`; test secret is `e2e-test-reset-token`.
- Port verification: port `3000` was occupied by an unrelated `botos-ser` process (PID `39281`); port `3100` was free. No process was stopped.
- Baseline commands passed:
  - `pnpm lint` — 0 warnings, 0 errors.
  - `pnpm typecheck` — passed.
  - `pnpm check-adapters` — 46 adapters validated.
  - `pnpm check-doc-coverage` — 46/46 adapters documented.
  - `pnpm test:unit` — 70 files, 693 tests passed.
- 100-card profile procedure: use the same seeded 100-card fixture, browser, hardware, and polling interval for a 30-second before/after capture; record React commit frequency, scripting time, responsiveness, hidden/resumed behavior, and reduced-motion behavior. No performance claim is made until this comparison runs.
- Adapter outcome inspection: `generic-ping` and `generic-rest` catch transport failures and return `_status: "error"`; `apcups` can return `_status: "warn"` with newly fetched UPS data. A resolved promise or warning alone is not used as freshness proof. T004 fixtures preserve these distinctions.

## Story evidence

Evidence will be appended after each task or story checkpoint. Tasks remain unchecked until their targeted validation passes.

## T003–T004 foundational reproduction

Date: 2026-09-11

- `CI=1 LABITAT_E2E_PORT=3100 pnpm exec playwright test tests/e2e/edit-mode.spec.ts tests/e2e/navigation.spec.ts --grep "reproduces all edit-to-view|back and forward"` ran against the isolated production server.
- Browser reproduction confirmed group, item/service configuration, membership, and order changes were visible in `/edit` before Done. The combined title path failed: after entering `No Reload Dashboard`, Done remained on `/edit`; this is retained as a baseline expected-failure test until title failure/pending handling is fixed.
- Browser history reproduction failed after a successful group rename: Back returned to `/edit` with the pre-save `Navigation Group` instead of `Saved Navigation Group`. No hard reload was used. This confirms the reported route/browser symptom at the user-flow boundary.
- Initial Playwright attempt was blocked by missing Chromium; `pnpm exec playwright install chromium` installed the locked browser build before the reproduction run.
- Fixture identities added under `tests/helpers/mocks/live-observations.ts`: `fixture-item-1`, configuration revision `7`, plus `successful`, `failedAfterSuccess`, `freshDegraded`, `legacyCache`, `queued`, and `slow` fixtures. They encode transport failure separately from fresh degraded data and do not access production DB state.

## T005–T012 US1 checkpoint

Date: 2026-09-11

- Focused Vitest regression: `pnpm exec vitest run src/lib/live-store.test.ts src/components/dashboard/live-provider.test.tsx src/components/dashboard/use-item-live.test.tsx src/components/editor/item-dialog.preview.test.tsx src/actions/items.test.ts` — 5 files, 13 tests passed.
- Type safety: `pnpm typecheck` — passed.
- Development browser matrix: `LABITAT_E2E_MODE=development LABITAT_E2E_PORT=3114 pnpm exec playwright test tests/e2e/edit-mode.spec.ts tests/e2e/navigation.spec.ts tests/e2e/drag-drop.spec.ts tests/e2e/dashboard-title.spec.ts --project=chromium` — 26 tests passed.
- Production browser matrix: `LABITAT_E2E_MODE=production LABITAT_E2E_PORT=3120 pnpm exec playwright test tests/e2e/edit-mode.spec.ts tests/e2e/navigation.spec.ts tests/e2e/drag-drop.spec.ts tests/e2e/dashboard-title.spec.ts --project=chromium` — 26 tests passed. The corrected history scenarios start at `/` and enter `/edit` through the visible Edit action; focused rerun on port `3118` and this clean matrix both passed.
- The final Done race was reproduced in production: a layout Server Action could still reconcile the client tree while a synthetic click targeted the replaced button node. Layout pending now remains true through two animation frames after the canonical response; the no-reload sequence uses an enabled-state wait and a real click. The focused production test passed on port `3113`.
- Mutation recovery evidence: failed reorder restores the pre-drag order; Escape cancellation restores the original order; failed title save stays on `/edit`, preserves the draft, and exposes an error; group/item/config/membership/order/title changes survive view navigation and back/forward without `page.reload()`.
- Additive schema evidence: migration `drizzle/0006_loose_ted_forrester.sql` adds nonsecret `configuration_revision` metadata. Legacy cache timestamps remain unknown success provenance in the initial snapshot.
