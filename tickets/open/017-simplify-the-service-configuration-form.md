---
id: "017"
title: "Simplify the service configuration form"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

New Item presents label, URL, icon, service type, service config, polling, and stat presentation in one scrolling form. Link URL and adapter endpoint can appear together without a clear distinction. The footer scrolls with the entire 80vh dialog.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/components/editor/item-dialog.tsx.

## Discussion proposal

Explore selecting link versus service first, separating launch URL from server API endpoint, grouping advanced settings, and keeping primary actions reachable on small screens. This is a design proposal, not a confirmed overflow defect.
