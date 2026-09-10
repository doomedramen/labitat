---
id: "020"
title: "Make the Search widget perform an actual search"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

Every engine chip links to Google with the engine name as the query. For example, DuckDuckGo opens a Google search for DuckDuckGo. There is no query input.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/lib/adapters/search.tsx.

## Discussion proposal

Provide a labeled query field and working engine destinations, or explicitly rename the widget as search-engine shortcuts and link to each engine homepage. Choose one clear interaction model.
