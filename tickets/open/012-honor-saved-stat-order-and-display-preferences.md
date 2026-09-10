---
id: "012"
title: "Honor saved stat order and display preferences"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

WidgetContainer filters unused stats but never orders them by statCardOrder.active. WidgetStatGrid hardcodes displayMode="label" despite the saved icon setting. StatCard also ignores valueClassName. The editor preview therefore differs from the dashboard.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/components/widgets/widget-container.tsx; src/components/dashboard/item/widget-stat-grid.tsx; src/components/dashboard/item/stat-card.tsx.

## Discussion proposal

Render saved active order and selected label/icon mode consistently in preview and dashboard, and preserve meaningful metric value styling.
