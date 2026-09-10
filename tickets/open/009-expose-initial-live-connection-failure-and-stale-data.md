---
id: "009"
title: "Expose initial live connection failure and stale data"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

The banner returns early until hasConnectedRef becomes true. If the initial SSE connection never succeeds, no connection warning appears. The rendered reconnecting message also lacks status/live semantics.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/components/dashboard/sse-banner.tsx.

## Discussion proposal

Show a delayed initial connection failure state as well as reconnecting state, announce meaningful changes, and explain when displayed metrics are stale.
