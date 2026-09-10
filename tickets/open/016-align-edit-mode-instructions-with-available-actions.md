---
id: "016"
title: "Align edit-mode instructions with available actions"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

The footer says “Select a card to edit it”, but only the Edit button calls onEdit; card content does not. Instructions are hidden entirely on mobile.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/components/dashboard/edit-bar.tsx; src/components/dashboard/item/item-card-dummy.tsx.

## Discussion proposal

Either support the stated card action or change the wording to identify the Edit control. Provide concise touch-appropriate instructions and clarify which changes save immediately.
