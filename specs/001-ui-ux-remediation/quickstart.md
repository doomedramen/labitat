# Validation quickstart

This guide describes implementation verification. It has not been executed as proof that the planned fixes work.

## Prerequisites and isolation

Use Node 22+ and the checked-in pnpm lockfile. Run from the repository root. Install dependencies with `pnpm install --frozen-lockfile` and browser support with `pnpm exec playwright install chromium` if needed. Read the installed Next.js guides listed in research.md before editing code.

First complete T001: make `playwright.config.ts` consume `LABITAT_E2E_PORT` consistently for baseURL, server URL, command, and PORT; set it to 3100 for this program and reject unintended server reuse. Confirm the server uses `data/labitat.test.db`, test-only secrets from the fixture configuration, and mock services. Do not use the default port 3000 command if its occupant is unknown. Do not reset or seed the user's database.

The commands below using LABITAT_E2E_PORT are valid only after T001. Set up the dev-mode equivalent on the same isolated fixture database separately; never run dev and production servers on the same port or against the same test DB concurrently.

For production-mode browser tests, use `CI=1 LABITAT_E2E_PORT=3100 pnpm exec playwright test <suite>`. Playwright creates the isolated production server, rejects reuse of any existing process, and runs database reset/seed against `data/labitat.test.db` only.

For isolated development-mode browser tests, use the Playwright mode switch with a different port:

```sh
CI=1 LABITAT_E2E_MODE=development LABITAT_E2E_PORT=3101 pnpm exec playwright test <suite>
```

The development and production modes each reset `data/labitat.test.db` before starting and never share a port concurrently. Never point either mode at the default `data/labitat.db` when resetting or seeding.

## Targeted checks

```sh
pnpm exec vitest run src/lib/live-store.test.ts src/components/dashboard/live-provider.test.tsx src/components/dashboard/use-item-live.test.tsx
pnpm exec vitest run src/lib/polling-supervisor.test.ts src/lib/server-cache.test.ts
CI=1 LABITAT_E2E_PORT=3100 pnpm exec playwright test tests/e2e/edit-mode.spec.ts tests/e2e/navigation.spec.ts tests/e2e/drag-drop.spec.ts tests/e2e/dashboard-title.spec.ts
CI=1 LABITAT_E2E_PORT=3100 pnpm exec playwright test tests/e2e/status-pill.spec.ts tests/e2e/offline.spec.ts tests/e2e/stat-cards.spec.ts
CI=1 LABITAT_E2E_PORT=3100 pnpm exec playwright test tests/e2e/auth.spec.ts tests/e2e/setup.spec.ts tests/e2e/mobile.spec.ts tests/e2e/widgets.spec.ts
```

Extend these existing suites for planned behavior; legacy test titles such as status-pill do not dictate the new UI design. Run only the relevant suite per increment, then full regression at integration. Record a failing case before fixing complex behavior; simple wording changes need no new test.

## Story acceptance runs

1. **US1**: Visit view, enter edit, change group/item/title/config/order, save, Done, back/forward. Never call reload. Repeat after add/delete with an existing card remaining mounted. Inject save failure and cancel a cross-group drag. Expect canonical saved structure, continuing live updates, and retained drafts/rollback on failure. Run in both dev and production.
2. **US2**: Controlled service succeeds, fails twice, responds slowly, queues, disconnects before first connection, reconnects, and resumes after hidden tab. Expect separate last attempt/success, honest schedule, stale labels, and accessible status disclosure. Repeat legacy cache/startup and clock-skew cases.
3. **US3**: Customize three metrics, hide every metric, restore by keyboard and tap, switch icon/label mode, save and revisit. Expect identical preview/view order and meaningful labels.
4. **US4**: Load item A slowly then switch to B; reject loading; retry; submit invalid fields; activate Save twice; dismiss dirty/clean forms; operate picker with arrows, Enter, Escape. Expect no stale load overwrite, one mutation, correct focus and errors, and protected drafts.
5. **US5**: Desktop, 320px and 390px widths, 200% zoom, software keyboard, light/dark themes, reduced motion. Expect 44px primary touch targets, reachable footer, no page horizontal overflow, matching instructions, and static nonessential motion.
6. **US6**: Linked card with status and Search; submit empty and special-character queries to all engines; inspect chart point. Expect independent navigation, encoded correct destination, timestamp/range, and text summary.

Use keyboard-only plus VoiceOver or equivalent for the core form and status journeys. Do not present automated accessibility checks as a substitute for the assistive-technology run.

## Performance evidence

Use the same seeded 100-card fixture, browser, hardware, and polling interval for a 30-second before/after capture. Record React commit frequency, scripting time, and responsiveness; check hidden/resumed and reduced-motion cases. The planned constraint is shared/coarse timing updates, not a promised percentage speedup. Explain any unchanged or worse measurement.

## Repository gates and evidence

```sh
pnpm lint
pnpm typecheck
pnpm exec oxfmt --check .
pnpm test:unit
pnpm check-adapters
pnpm check-doc-coverage
pnpm build
CI=1 LABITAT_E2E_PORT=3100 pnpm test:e2e
```

Inspect formatter scope and do not commit unrelated rewrites. Existing pre-push hooks also enforce build/typecheck/adapter/doc checks. For each completed story, record commands, outcomes, screenshots/traces where useful, and remaining limitations in `validation.md` in this feature directory. Commit logical increments and push without co-author trailers. Follow the ticket-transition skill when actually closing verified tickets; planning does not transition them.
