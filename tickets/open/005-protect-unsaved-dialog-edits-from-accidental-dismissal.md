---
id: "005"
title: "Protect unsaved dialog edits from accidental dismissal"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

Dialog open changes directly close editors. ItemDialog resets fields when closed, so Escape, outside click, or the close control can discard a lengthy configuration without a dirty-state check.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/components/editor/item-dialog.tsx; src/components/editor/group-dialog.tsx.

## Discussion proposal

Track dirty state and offer a clear discard choice or recoverable draft when dismissing an edited form. Avoid interrupting clean dialogs.
