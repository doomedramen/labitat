---
id: "004"
title: "Show pending states for editor mutations"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

Create and Update buttons have no submitting state or disabled binding. Confirmation invokes asynchronous deletion through a void callback and closes immediately. Users receive no visible progress while waiting.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/components/editor/group-dialog.tsx; src/components/editor/item-dialog.tsx; src/components/confirm-dialog-client.tsx.

## Discussion proposal

Show action-specific pending feedback, prevent repeated activation, and preserve a recoverable context on failure. Apply this consistently to create, update, and delete.
