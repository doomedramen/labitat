# Labitat planning constitution

## Core Principles

### I. Preserve the existing product

Plan incremental improvements to the existing self-hosted dashboard and its 26 review tickets. Preserve authentication, stored credentials, configured services, and existing dashboards. This planning request does not start implementation or close tickets.

### II. Follow repository instructions

Read the relevant installed Next.js guides before code changes. Use only gpt-5.6-luna for agent work unless the user explicitly changes that restriction. Commit and push logical increments regularly; do not add co-author attribution. User instructions take precedence over generated workflow defaults.

### III. Separate evidence from assumptions

Source review and store probes are evidence; they are not browser reproduction of the hard-refresh report. Reproduce behavioral defects at the user-flow boundary before selecting fixes. Record measurements before claiming performance gains.

### IV. Validate the changed behavior

Use targeted regression coverage for state, persistence, timing, and accessibility interactions. Do not create tests that merely mirror trivial copy changes. Complete repository checks before pushing and preserve the test database isolation described in the plan.

### V. Keep delivery bounded

Each story has explicit ticket coverage, dependencies, and an independent acceptance checkpoint. Reuse the current stack; avoid unrelated framework migrations or new authentication systems. Keep all implementation checkboxes open until their work is actually verified.

## Workflow and scope

This document records existing project instructions and the scope of the requested planning work. Specific product choices in specs are planning assumptions, not new user mandates. Implementation should follow the ordered tasks and record evidence alongside completed tickets.

## Governance

The user's instructions and AGENTS.md control conflicts. Update these planning constraints when the user changes scope; do not interpret them as a new approval requirement.

**Version**: 1.0.0 | **Ratified**: 2026-09-10 | **Last Amended**: 2026-09-10
