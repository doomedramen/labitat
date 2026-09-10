# UI/UX review tickets

Review date: 2026-09-10. Reviewed dashboard, edit mode, service configuration, authentication/setup, shared widgets, status feedback, and offline behavior through source inspection and the repository dashboard/edit-mode screenshots. No live browser, responsive viewport, contrast measurement, or assistive-technology testing was performed. Two synthetic probes additionally confirmed same-key snapshot rejection and lost subscriptions after membership changes in the actual live-store module; these do not establish the full cause of the user-reported browser symptom. Dependencies were absent, and port 3000 belonged to another process. These limitations do not establish a runtime defect.

The visual structure is consistent: grouped services, restrained surfaces, and a clear view/edit separation. The most consequential findings concern saved preferences, editing recovery, and access to controls and health information. Resolve those before visual polish.

These are local deferred-work records, not implemented changes or GitHub issues. Existing GitHub submission templates do not define a local ticket workflow, so tickets use the fallback open/in-progress/closed convention and default medium priority. Each ticket distinguishes source evidence from its proposed improvement.

## Tickets

- [001: Correct setup password guidance](open/001-correct-setup-password-guidance.md)
- [002: Connect form errors and labels to their controls](open/002-connect-form-errors-and-labels-to-their-controls.md)
- [003: Handle service configuration loading failures and races](open/003-handle-service-configuration-loading-failures-and-races.md)
- [004: Show pending states for editor mutations](open/004-show-pending-states-for-editor-mutations.md)
- [005: Protect unsaved dialog edits from accidental dismissal](open/005-protect-unsaved-dialog-edits-from-accidental-dismissal.md)
- [006: Repair service picker keyboard and screen reader behavior](open/006-repair-service-picker-keyboard-and-screen-reader-behavior.md)
- [007: Enlarge mobile editor and header touch targets](open/007-enlarge-mobile-editor-and-header-touch-targets.md)
- [008: Make service health details accessible without hover](open/008-make-service-health-details-accessible-without-hover.md)
- [009: Expose initial live connection failure and stale data](open/009-expose-initial-live-connection-failure-and-stale-data.md)
- [010: Provide keyboard and click alternatives for stat layout editing](open/010-provide-keyboard-and-click-alternatives-for-stat-layout-editing.md)
- [011: Allow restoring stats after hiding every metric](open/011-allow-restoring-stats-after-hiding-every-metric.md)
- [012: Honor saved stat order and display preferences](open/012-honor-saved-stat-order-and-display-preferences.md)
- [013: Restore dashboard state when dragging is cancelled](open/013-restore-dashboard-state-when-dragging-is-cancelled.md)
- [014: Recover cross-group moves consistently when saving fails](open/014-recover-cross-group-moves-consistently-when-saving-fails.md)
- [015: Keep title edits recoverable when saving fails](open/015-keep-title-edits-recoverable-when-saving-fails.md)
- [016: Align edit-mode instructions with available actions](open/016-align-edit-mode-instructions-with-available-actions.md)
- [017: Simplify the service configuration form](open/017-simplify-the-service-configuration-form.md)
- [018: Respect reduced motion across dashboard visuals](open/018-respect-reduced-motion-across-dashboard-visuals.md)
- [019: Give timeseries charts a readable time context](open/019-give-timeseries-charts-a-readable-time-context.md)
- [020: Make the Search widget perform an actual search](open/020-make-the-search-widget-perform-an-actual-search.md)
- [021: Avoid nesting widget links inside the service launch link](open/021-avoid-nesting-widget-links-inside-the-service-launch-link.md)
- [022: Make polling status and next-poll timing explicit](open/022-make-polling-status-and-next-poll-timing-explicit.md)
- [023: Preserve the age of successful data after failed polls](open/023-preserve-the-age-of-successful-data-after-failed-polls.md)
- [024: Reduce per-card polling animation work](open/024-reduce-per-card-polling-animation-work.md)
- [025: Apply edit-mode changes without requiring a hard refresh](open/025-apply-edit-mode-changes-without-requiring-a-hard-refresh.md)
- [026: Preserve live subscribers when dashboard item membership changes](open/026-preserve-live-subscribers-when-dashboard-item-membership-changes.md)
