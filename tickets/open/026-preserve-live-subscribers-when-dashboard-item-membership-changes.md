---
id: "026"
title: "Preserve live subscribers when dashboard item membership changes"
status: open
priority: medium
created: "2026-09-10T22:38:19Z"
updated: "2026-09-10T22:38:19Z"
tags: [ui-ux, review, polling]
---

## Problem

initOnce calls itemListeners.clear() whenever the snapshot key changes. Existing mounted hooks use stable subscriptions keyed by item ID, so surviving subscribers can be detached unless the consumers remount or resubscribe. A direct Node probe subscribed to item a, initialized a new a,b snapshot, and sent an update to a: notification count stayed 0. This is a confirmed store-level behavior; the mounted browser lifecycle still needs reproduction.

## Context

Additional review requested on 2026-09-10. Source: src/lib/live-store.ts (initOnce); src/components/dashboard/live-provider.tsx; src/components/dashboard/use-item-live.ts. No live browser reproduction was performed. Store probes ran directly against src/lib/live-store.ts using Node type stripping and synthetic data; no application data was changed.

## Discussion proposal

Reconcile item membership without silently deleting valid subscriptions; notify consumers of replacements and keep hydration snapshots current. Cover adding/removing items while an existing card remains mounted. Coordinate with ticket 025, while keeping subscription continuity distinct from same-key snapshot reconciliation.
