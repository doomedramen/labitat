---
id: "025"
title: "Apply edit-mode changes without requiring a hard refresh"
status: open
priority: medium
created: "2026-09-10T22:38:19Z"
updated: "2026-09-10T22:38:19Z"
tags: [ui-ux, review, polling]
---

## Problem

User report: “after making a change in edit mode, it does not seem to be applied until hard refreshing the page”. The exact changed field and browser sequence are not yet reproduced. Group mutations return DB data but do not revalidate routes, whereas item mutations revalidate both routes. Done navigates with router.push after saving the title. Both pages derive snapshotKey solely from sorted item IDs; initOnce ignores new snapshots with that same key. A direct Node probe of the real live store initialized a before snapshot, supplied an after snapshot with the same ID/key, and still read before. This confirms a store behavior, not the complete cause of the reported UI symptom.

## Context

Additional review requested on 2026-09-10. Source: src/actions/groups.ts; src/actions/items.ts; src/actions/settings.ts; src/components/dashboard/dashboard-client.tsx; src/app/page.tsx; src/app/edit/page.tsx; src/components/dashboard/live-provider.tsx; src/lib/live-store.ts. No live browser reproduction was performed. Store probes ran directly against src/lib/live-store.ts using Node type stripping and synthetic data; no application data was changed.

## Discussion proposal

Reproduce edit/save/Done/back navigation for group names, item properties, configuration, ordering, and title, distinguishing structural content from live widget data. Reconcile route invalidation and store snapshots so successful edits appear immediately without losing newer SSE data. The stat rendering defect in ticket 012 is separate and will not be fixed by refreshing. Validate without hard reload in development and production.
