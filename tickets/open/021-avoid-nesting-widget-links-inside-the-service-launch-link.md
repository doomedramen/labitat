---
id: "021"
title: "Avoid nesting widget links inside the service launch link"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

ItemCard wraps all ItemCardContent, including ItemLiveView, in an anchor whenever item.href exists. SearchWidget renders its own anchors, creating nested links when the search item also has a launch URL.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/components/dashboard/item/item-card.tsx; src/lib/adapters/search.tsx.

## Discussion proposal

Separate the service launch link from interactive widget content. Preserve independent focus, click, and touch behavior for each widget action.
