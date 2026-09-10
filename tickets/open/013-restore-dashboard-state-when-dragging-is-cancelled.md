---
id: "013"
title: "Restore dashboard state when dragging is cancelled"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

handleDragOver immediately moves items between local groups, but DndContext has no onDragCancel handler. Cancelling a drag with Escape has no path to restore the pre-drag arrangement or clear activeId.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/components/dashboard/edit-mode.tsx; src/components/dashboard/dashboard-client.tsx.

## Discussion proposal

Capture the pre-drag arrangement and restore it on cancellation, clearing overlay and source-group state. Verify cancellation after crossing group boundaries.
