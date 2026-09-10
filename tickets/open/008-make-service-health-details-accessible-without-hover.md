---
id: "008"
title: "Make service health details accessible without hover"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

Health details and update age are behind HoverCard on a non-focusable div. Click only prevents navigation. Error payloads remove widget content, leaving the small colored status dot as the main visible indication.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/components/dashboard/item/status-dot/index.tsx; src/components/dashboard/item/status-dot/status-dot-client.tsx; src/components/dashboard/item/item-live-view.tsx; src/components/widgets/widget-container.tsx.

## Discussion proposal

Offer a keyboard- and touch-operable status disclosure, visible text for important failures and cached data, and useful recovery guidance. Preserve existing accessible status labels; do not rely on color alone.
