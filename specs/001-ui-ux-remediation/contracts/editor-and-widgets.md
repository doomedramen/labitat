# Editor and widget contracts

## Mutation lifecycle

Successful create/update/delete/move returns canonical saved state and invalidates affected routes. Pending operations cannot be submitted twice. Failure retains a recoverable draft or restores the pre-operation arrangement; it does not close the editor or falsely report success. Done waits for outstanding arrangement changes and a valid title save. Existing auth guards remain mandatory.

Cross-group moves are atomic. Escape and drop cancellation restore the drag-start snapshot. Serialize moves so a slow response cannot roll back a later user edit. View mode after Done and back/forward navigation reflects saved structure without reload. Newly fetched service values may arrive later, with freshness described separately.

## Form interaction

Fields have stable IDs, labels, and described help/errors. Failed submit focuses the first invalid field or a linked summary. No focus theft on each keystroke. Configuration loading is cancel-safe; stale responses never replace current draft. Failed load offers retry. Dirty dismissal requires explicit discard; clean dialogs close directly.

Service combobox exposes active option and selection semantics. Escape first closes the picker, not the containing editor; choosing restores trigger focus. Setup help says at least eight characters.

## Metric interaction

Keyboard and tap actions can move, show, and hide each metric without dragging. Buttons name their metric. The empty active list offers restoration. View and preview share normalized ordering and presentation. Icon-only metrics retain accessible labels; value styling remains meaningful.

## Form layout and touch

Basic identity/launch settings precede connection and advanced settings. Clarify that launch URL opens in the user's browser and service endpoint is reached by the Labitat server. At 320px/390px and 200% zoom, controls and save/cancel remain reachable with the software keyboard. Primary coarse-pointer targets are at least 44px square without overlap. Instructions identify the Edit control and explain immediate saves.

## Widget actions

The service launch link is a distinct action, not an ancestor of other anchors, buttons, or inputs. Status and Search controls operate independently. Preserve current new-tab behavior for explicit external actions and disclose it accessibly where helpful.

Search has a labeled query input and supported engine choice. Submit maps to https://www.google.com/search?q=…, https://duckduckgo.com/?q=…, or https://www.bing.com/search?q=… using safely encoded query values. Empty input stays in place with clear guidance. Unknown saved engine names never silently become Google search terms.

Chart displays covered time range, point timestamp with timezone context, and readable latest values/trend summary. Reduced motion suppresses nonessential chart transitions and decorative loops without hiding content.
