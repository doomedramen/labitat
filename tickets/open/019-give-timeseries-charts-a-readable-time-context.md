---
id: "019"
title: "Give timeseries charts a readable time context"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

XAxis is hidden and ChartTooltip only renders metric names and percentages. Users cannot tell when a spike occurred or what time window the chart covers.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/components/widgets/glances-timeseries-widget.tsx.

## Discussion proposal

Show the covered time range and a timestamp in the tooltip, and provide an accessible textual summary of the trend. Keep compact dashboard sizing.
