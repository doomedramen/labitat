---
id: "023"
title: "Preserve the age of successful data after failed polls"
status: open
priority: medium
created: "2026-09-10T22:38:19Z"
updated: "2026-09-10T22:38:19Z"
tags: [ui-ux, review, polling]
---

## Problem

recordServiceFailure copies cached metrics and emits a new cache update. SSE stamps that event with Date.now(), and liveStore sets lastFetchedAt to it. ItemLiveView then labels the old metrics “Updated” recently because a live event exists, even though the service returned no fresh values. Separately, tooltip age is computed only during ItemLiveView renders; the per-frame ring update occurs in a child and does not refresh that age during a long outage.

## Context

Additional review requested on 2026-09-10. Source: src/lib/polling-supervisor.ts (recordServiceFailure); src/app/api/events/route.ts; src/lib/live-store.ts; src/components/dashboard/item/item-live-view.tsx. No live browser reproduction was performed. Store probes ran directly against src/lib/live-store.ts using Node type stripping and synthetic data; no application data was changed.

## Discussion proposal

Track last successful data fetch separately from last attempted poll/event. Keep old metrics explicitly stale after failures and update relative-age text while a status disclosure is open. Display an absolute timestamp when useful. Do not reset data freshness merely because an error notification arrived.
