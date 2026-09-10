---
id: "014"
title: "Recover cross-group moves consistently when saving fails"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

Cross-group moves are optimistic. One reorderItems failure branch only shows a toast, another restores a snapshot already taken after the cross-group move, and the source-group reorder promise has no catch. The screen can retain an arrangement that was not saved.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/components/dashboard/dashboard-client.tsx.

## Discussion proposal

Treat the move as one recoverable operation, preserve a pre-move snapshot, handle all failures, and reconcile the displayed arrangement with persisted state.
