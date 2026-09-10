---
id: "024"
title: "Reduce per-card polling animation work"
status: open
priority: medium
created: "2026-09-10T22:38:19Z"
updated: "2026-09-10T22:38:19Z"
tags: [ui-ux, review, polling]
---

## Problem

Every status dot runs its own requestAnimationFrame loop and updates React state continuously until the interval elapses. A large dashboard therefore schedules many status renders to draw a 16px indicator. There is no reduced-motion branch. This is a source-level performance concern, not a measured regression.

## Context

Additional review requested on 2026-09-10. Source: src/hooks/use-sync-progress.ts; src/components/dashboard/item/status-dot/index.tsx. No live browser reproduction was performed. Store probes ran directly against src/lib/live-store.ts using Node type stripping and synthetic data; no application data was changed.

## Discussion proposal

Profile a representative large dashboard, then use a shared/coarser timer or a suitable CSS animation with timestamp reconciliation. Honor reduced motion and visibility. Keep readable timestamps accurate without requiring every card to render at display refresh rate.
