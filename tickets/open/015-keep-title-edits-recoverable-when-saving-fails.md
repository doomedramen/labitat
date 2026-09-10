---
id: "015"
title: "Keep title edits recoverable when saving fails"
status: open
priority: medium
created: "2026-09-10T22:37:01Z"
updated: "2026-09-10T22:37:01Z"
tags: [ui-ux, review]
---

## Problem

handleSaveTitle catches failure internally and Done always navigates away afterwards. Blank titles silently skip saving; TitleForm sets aria-invalid without showing the validation message. Other edits save immediately while title edits wait for Done.

## Context

Filed from the requested project UI/UX review on 2026-09-10. Evidence comes from source inspection; the interaction has not been reproduced in a running browser.

Source: src/components/dashboard/dashboard-client.tsx; src/components/dashboard/title-form.tsx; src/components/dashboard/edit-bar.tsx.

## Discussion proposal

Keep the editor and draft open on title-save failure, display validation text, and make saving/saved/failed status and the title save rule clear.
