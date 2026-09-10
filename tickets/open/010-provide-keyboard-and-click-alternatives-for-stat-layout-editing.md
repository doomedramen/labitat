---
id: "010"
title: "Provide keyboard and click alternatives for stat layout editing"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

EditableStatGrid registers only PointerSensor and uses pointerWithin. Its focusable sortable elements advertise dragging but have no keyboard sensor or explicit show/hide/reorder controls.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/components/dashboard/item/editable-stat-grid.tsx.

## Discussion proposal

Provide keyboard ordering and accessible show/hide controls, including a click/tap alternative to dragging. Name each action with its metric label.
