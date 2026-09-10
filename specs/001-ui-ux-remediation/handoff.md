# Implementation handoff

## Start here

This is a complete planning handoff for the 26 UI/UX tickets. Spec Kit 1.0.1 is installed in this repository with Codex skills. Feature selection is persisted locally in `.specify/feature.json`; Spec Kit intentionally ignores that per-checkout file. The shared feature directory is `specs/001-ui-ux-remediation`. All 48 implementation tasks are unchecked and all tickets remain open.

Read in order:

1. `AGENTS.md` and `.specify/memory/constitution.md` for project constraints.
2. [spec.md](spec.md) for outcomes, scope, and defaults.
3. [plan.md](plan.md), [research.md](research.md), and [data-model.md](data-model.md) for decisions and evidence limits.
4. [live-state contract](contracts/live-state.md) and [editor/widget contract](contracts/editor-and-widgets.md).
5. [tasks.md](tasks.md), [ticket-map.md](ticket-map.md), and [quickstart.md](quickstart.md) for execution and validation.

## Select the feature in a new checkout

Run from the repository root before invoking implementation. This restores the machine-local feature pointer without regenerating artifacts:

```sh
SPECIFY_FEATURE_DIRECTORY=specs/001-ui-ux-remediation .specify/scripts/bash/check-prerequisites.sh --json --require-tasks --include-tasks
```

The result must name this feature directory and include tasks.md. The override is needed in a new worktree even though this checkout already has its local pointer.

## Execution rules

- Use only gpt-5.6-luna unless the user authorizes another model. One implementation agent is sufficient; no automatic delegation is requested.
- Begin at T001, not with visual restyling. Make the test server/DB isolated before reset/seed/browser tests. The prior review found an unrelated process on port 3000.
- Reproduce the edit-to-view symptom without hard reload. Source suspicions and store probes do not prove its full browser cause.
- Preserve current start-anchored polling cadence and separate data success from attempt/scheduling. Follow R8 for adapter-returned errors and process-local timing.
- The planning agent made no application changes. Implement US1 first, then US2, then US3–US6 in order. US1 is the first useful milestone; do not stop the entire program there.
- Preserve configured data and credentials. Use additive migrations for metadata and explicit unknown states for legacy records. Do not infer successful freshness from old cache write times.
- Read relevant installed Next.js docs before code changes; do not perform an unrelated framework upgrade.
- Commit and push coherent increments without co-author trailers. Run required hooks and targeted checks; do not bypass failed gates.
- Record validation in `specs/001-ui-ux-remediation/validation.md` as implementation proceeds. Only check off tasks and transition tickets after their acceptance evidence passes.

## Known baseline

The review commit `5de7992` added 26 tickets. Its build, typecheck, adapter checks, and documentation coverage passed. The review did not run live browser acceptance. Two direct live-store probes confirmed same-key snapshot rejection and lost surviving subscriptions after a key change. Installation of locked dependencies succeeded. No performance gain, accessibility compliance, or complete refresh fix has been claimed.

## Proposed starting prompt

> Implement the UI/UX remediation plan in `specs/001-ui-ux-remediation/`. Use only gpt-5.6-luna. Read `handoff.md`, the specification, contracts, and `tasks.md`, then work through all 48 tasks in dependency order. Start with isolated test setup and reproduction of edits requiring hard refresh, followed by trustworthy polling status. Preserve user data, existing configuration, and authentication. Keep evidence in `validation.md`, update task checkboxes only after verification, and close tickets through the ticket workflow only when their acceptance checks pass. Commit and push coherent increments without co-author trailers. Continue through all 26 tickets; do not stop after planning or the first milestone.

You can invoke the repository's `$speckit-implement` workflow with that context. Do not regenerate the completed specification or task list before starting unless concrete evidence requires an amendment.
