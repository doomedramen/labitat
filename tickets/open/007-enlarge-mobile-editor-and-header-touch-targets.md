---
id: "007"
title: "Enlarge mobile editor and header touch targets"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

Header small buttons are 28px high, default buttons 32px, group controls 32px, and item actions use small icons with 4px vertical padding and 10px text. This makes closely packed edit/delete actions difficult to target on touch devices.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/components/ui/button.tsx; src/components/dashboard/header.tsx; src/components/dashboard/group-dummy.tsx; src/components/dashboard/item/item-card-dummy.tsx.

## Discussion proposal

Provide roughly 44px touch hit areas and sufficient separation on coarse pointers, while retaining compact desktop presentation where useful. Increase editor action-label readability.
