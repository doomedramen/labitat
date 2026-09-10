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

## Story evidence

Evidence will be appended after each task or story checkpoint. Tasks remain unchecked until their targeted validation passes.
