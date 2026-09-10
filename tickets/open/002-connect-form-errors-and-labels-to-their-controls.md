---
id: "002"
title: "Connect form errors and labels to their controls"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

Inline errors are plain paragraphs without IDs or aria-describedby. Authentication server errors have no live announcement. Dynamic select labels reference config IDs that are absent from SelectTrigger.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/components/auth/login-form.tsx; src/app/setup/setup-form.tsx; src/components/editor/group-dialog.tsx; src/components/editor/item-dialog.tsx.

## Discussion proposal

Associate errors and help with controls, label every select trigger, and announce failed submission with a focusable summary or appropriate error focus. Preserve field-level messages.
