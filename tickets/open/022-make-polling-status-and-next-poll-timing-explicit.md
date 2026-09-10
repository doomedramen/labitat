---
id: "022"
title: "Make polling status and next-poll timing explicit"
status: open
priority: medium
created: "2026-09-10T22:38:19Z"
updated: "2026-09-10T22:38:19Z"
tags: [ui-ux, review, polling]
---

## Problem

The user specifically requested review of the top-right polling indicator. useSyncProgress grows from 0 to 100 with elapsed time since itemLastUpdateAt. The dot comments describe a depleting countdown, but the SVG fills as elapsed time grows. The server schedules from poll start, while SSE timestamps arrive after cache updates. Queue limits, slow requests, idle intervals, and disconnection can make the ring differ from actual scheduling. No next-poll timestamp or polling-in-progress state reaches the browser.

## Context

Additional review requested on 2026-09-10. Source: src/hooks/use-sync-progress.ts; src/components/dashboard/item/status-dot/index.tsx; src/lib/polling-supervisor.ts; src/lib/live-types.ts; src/app/api/events/route.ts. No live browser reproduction was performed. Store probes ran directly against src/lib/live-store.ts using Node type stripping and synthetic data; no application data was changed.

## Discussion proposal

Define a clear visual model separating health, polling activity, and freshness. Expose last attempt, last success, next scheduled attempt, and in-flight state where available. If exact scheduling is unavailable, label estimates explicitly; avoid implying a full ring guarantees a poll. Include unknown, paused/disconnected, and overdue states. Pair the ring with readable details accessible through ticket 008.
