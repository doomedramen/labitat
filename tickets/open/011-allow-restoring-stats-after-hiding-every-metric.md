---
id: "011"
title: "Allow restoring stats after hiding every metric"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

Moving an unused stat back requires isOverActive, which only matches existing active item IDs. The empty active grid is not a droppable target. Once all metrics are unused there is no valid active destination.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/components/dashboard/item/editable-stat-grid.tsx.

## Discussion proposal

Add an empty active drop zone or explicit restore action. Verify hiding the final active metric and restoring one without resetting the whole item.
