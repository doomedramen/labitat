---
id: "001"
title: "Correct setup password guidance"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

The password placeholder says “At least 6 characters”, while setupSchema requires 8. A user following the displayed rule gets rejected.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/app/setup/setup-form.tsx.

## Discussion proposal

Replace the placeholder with consistent, persistent minimum-length help. Keep the client and server rule aligned.
