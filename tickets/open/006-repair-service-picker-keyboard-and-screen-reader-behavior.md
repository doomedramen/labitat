---
id: "006"
title: "Repair service picker keyboard and screen reader behavior"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

Arrow keys update activeIndex while focus remains in the search input, but no aria-activedescendant identifies the active option. Selecting removes the focused search input without restoring trigger focus. Escape does not stop propagation to the parent dialog.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/components/editor/item-dialog.tsx (ServiceCombobox).

## Discussion proposal

Use a complete combobox interaction model with identified active options, trigger focus restoration, and scoped Escape handling. Include the link-only option in the same focus/highlight model.
