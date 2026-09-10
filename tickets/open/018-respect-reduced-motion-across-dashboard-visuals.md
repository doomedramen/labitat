---
id: "018"
title: "Respect reduced motion across dashboard visuals"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

Global smooth scrolling and custom repeating animations have no reduced-motion override. Charts explicitly animate updates; the Matrix canvas runs a requestAnimationFrame loop without checking the preference.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/app/globals.css; src/components/widgets/glances-timeseries-widget.tsx; src/lib/adapters/matrix.tsx.

## Discussion proposal

Honor prefers-reduced-motion for continuous decorative motion, chart updates, and scrolling. Keep essential status information available in a static form.
