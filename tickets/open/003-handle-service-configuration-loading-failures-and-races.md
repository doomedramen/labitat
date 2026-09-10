---
id: "003"
title: "Handle service configuration loading failures and races"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

getItemConfig uses then/finally without catch or cancellation. A failed request removes the loading indicator without an actionable error; an older item/service response can replace current configFields. Update remains available while loading.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/components/editor/item-dialog.tsx.

## Discussion proposal

Track loading, loaded, and failed states; ignore obsolete responses; provide retry and prevent saving incomplete configuration. Verify behavior with delayed and rejected requests.
