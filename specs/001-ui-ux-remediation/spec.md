# Feature Specification: UI/UX remediation

**Feature Branch**: `main` (planning only; feature directory is independent of branch)

**Created**: 2026-09-10

**Status**: Planned; implementation not started

**Input**: “use speckit to make a plan to work through all tickets”, including polling indicators and edits requiring hard refresh.

## User Scenarios & Testing

### User Story 1 - See edits immediately and recover failures (Priority: P1)

As an administrator, I can save changes, leave edit mode, and see the saved result without reloading. Cancelled or failed actions preserve a recoverable draft.

**Tickets**: 025, 026, 013, 014, 015.

**Why this priority**: Directly addresses the reported hard-refresh symptom and risks of lost work.

**Independent Test**: Edit each supported property, finish editing, navigate back and forward, then simulate a failed save and cancelled cross-group move.

**Acceptance Scenarios**:

1. **Given** a dashboard already visited in view mode, **When** I save a group or item change and choose Done, **Then** the saved change is visible without a reload and surviving cards keep receiving live updates.
2. **Given** an item dragged into another group, **When** I cancel or the move fails, **Then** the original arrangement is restored and failure is explained.
3. **Given** a changed or blank dashboard title, **When** saving fails or validation rejects it, **Then** I stay in edit mode with my draft and an actionable message.

### User Story 2 - Understand health and polling freshness (Priority: P1)

As a dashboard viewer, I can distinguish service health, last successful data, latest poll attempt, and the next scheduled attempt using mouse, touch, or keyboard.

**Tickets**: 008, 009, 022, 023, 024.

**Why this priority**: Monitoring is only useful if stale values are not presented as fresh.

**Independent Test**: Exercise successful, slow, failed, initial disconnected, reconnecting, and resumed polling with controlled times.

**Acceptance Scenarios**:

1. **Given** a successful poll followed by a failure, **When** I inspect the status indicator, **Then** last-success time remains unchanged and the failed attempt is shown separately.
2. **Given** a queued, active, disconnected, or overdue poll, **When** I inspect its timing, **Then** the state is named accurately and no exact completion time is promised.
3. **Given** no successful live connection since page load, **When** the connection continues to fail, **Then** a delayed connection notice appears and is announced.

### User Story 3 - Customize metrics with predictable results (Priority: P2)

As an administrator, I can order, hide, restore, and choose metric presentation with pointer or keyboard, then see the same layout on the dashboard.

**Tickets**: 010, 011, 012.

**Why this priority**: Fixes existing settings that currently do not produce the promised result.

**Independent Test**: Reorder three metrics, hide all, restore one by keyboard and touch, switch presentation, save, and revisit.

**Acceptance Scenarios**:

1. **Given** a customized metric order and presentation, **When** I save and return to view mode, **Then** the order, visibility, labels or icons, and meaningful value styling match the editor.
2. **Given** every metric is hidden, **When** I restore one without dragging, **Then** it returns to the active layout without resetting the item.

### User Story 4 - Configure services without losing work (Priority: P2)

As an administrator, I can understand validation, select a service, load configuration safely, and save once with clear feedback.

**Tickets**: 001, 002, 003, 004, 005, 006.

**Why this priority**: Configuration often involves several fields and must tolerate slow or failed operations.

**Independent Test**: Complete setup and service editing by keyboard; delay and reject configuration loads; switch items during loading; dismiss a dirty form.

**Acceptance Scenarios**:

1. **Given** a setup password shorter than eight characters, **When** I read help and submit, **Then** the displayed rule and validation both require eight characters.
2. **Given** a configuration request still pending or superseded, **When** I switch items or try saving, **Then** obsolete values are not applied and incomplete loading cannot silently be saved.
3. **Given** invalid fields or a failed submission, **When** I use keyboard or assistive technology, **Then** errors identify their fields and focus reaches a useful recovery point.
4. **Given** a dirty dialog or a pending mutation, **When** I dismiss it or activate save again, **Then** discard is explicit and a duplicate operation is not started.
5. **Given** the service picker is open, **When** I choose an option or press Escape, **Then** the active option is identifiable and focus returns without unexpectedly closing the editor.

### User Story 5 - Use a clear and comfortable mobile editor (Priority: P3)

As a mobile or reduced-motion user, I can reach controls, understand edit instructions, and configure services without avoidable movement or hidden actions.

**Tickets**: 007, 016, 017, 018.

**Why this priority**: Builds on the corrected interactions before changing form presentation.

**Independent Test**: Review 320px, 390px, and desktop layouts with a long configuration, software keyboard, zoom, and reduced motion.

**Acceptance Scenarios**:

1. **Given** a touch device, **When** I edit or delete an item, **Then** primary controls have at least 44 by 44 CSS-pixel hit areas and distinct targets.
2. **Given** the service editor is open, **When** I enter connection details and advanced settings, **Then** launch address and service endpoint are clearly distinguished and save/cancel remain reachable.
3. **Given** reduced motion is enabled, **When** I view live updates and decorative widgets, **Then** nonessential continuous motion stops while status remains understandable.

### User Story 6 - Use meaningful widget actions and chart context (Priority: P3)

As a dashboard viewer, I can search with a selected engine, use widget controls separately from service links, and identify when chart changes occurred.

**Tickets**: 019, 020, 021.

**Why this priority**: Completes the remaining widget usability improvements.

**Independent Test**: Submit a query to each supported engine, activate a widget action on a linked card, and inspect a chart spike.

**Acceptance Scenarios**:

1. **Given** a Search widget with a selected supported engine, **When** I submit a query, **Then** that engine receives the encoded query rather than a search for its own name.
2. **Given** a service card containing another action, **When** I activate that action, **Then** only the intended action runs and keyboard focus identifies both controls separately.
3. **Given** a timeseries chart, **When** I inspect a historical point, **Then** its timestamp, displayed time range, and metric values are available.

### Edge Cases

- Same item IDs but new configuration; removed items receiving late updates; older snapshots arriving after fresh live data.
- Cancelling a cross-group drag, dropping outside targets, overlapping saves, failed moves, blank title, and browser back navigation.
- Last successful data survives multiple failures; first connection never succeeds; slow polls overlap their interval; server/client clocks differ; tab sleeps and resumes.
- No metrics active; saved metric IDs disappear after an adapter change; invalid legacy layout preferences.
- Loading an item then switching service or closing; long form with software keyboard; empty search query; unsupported saved engine name.

## Requirements

### Functional Requirements

- **FR-001**: Present an eight-character minimum consistently in account setup help and validation. (ticket 001).
- **FR-002**: Associate every editable field with its label, help, and error; announce submission failures and provide useful error focus. (ticket 002).
- **FR-003**: Ignore superseded configuration loads, expose failures with retry, and prevent saving incomplete loading states. (ticket 003).
- **FR-004**: Show pending feedback and prevent duplicate create, update, and delete operations. (ticket 004).
- **FR-005**: Protect dirty dialog drafts from accidental dismissal with an explicit discard decision. (ticket 005).
- **FR-006**: Make service selection announce the active option, restore focus on close, and scope Escape to the picker. (ticket 006).
- **FR-007**: Provide at least 44 by 44 CSS-pixel hit areas for primary touch actions, without overlapping neighboring targets. (ticket 007).
- **FR-008**: Make health, cached-data warnings, and recovery details accessible by touch and keyboard as well as pointer. (ticket 008).
- **FR-009**: Show and announce delayed initial connection failure and subsequent reconnecting state. (ticket 009).
- **FR-010**: Provide keyboard and click/tap controls to order and show or hide metrics. (ticket 010).
- **FR-011**: Allow restoring a metric when all metrics are hidden. (ticket 011).
- **FR-012**: Apply saved metric order, visibility, icon/label mode, and meaningful value styling in view mode. (ticket 012).
- **FR-013**: Restore the pre-drag arrangement and dismiss drag feedback when a move is cancelled. (ticket 013).
- **FR-014**: Reconcile failed cross-group moves with persisted state and explain the failure. (ticket 014).
- **FR-015**: Retain title drafts and edit mode after validation or save failure, with visible saving and error feedback. (ticket 015).
- **FR-016**: Make edit instructions describe the available action and explain which changes save immediately. (ticket 016).
- **FR-017**: Distinguish launch address from service endpoint, separate advanced settings, and keep form actions reachable on small screens. (ticket 017).
- **FR-018**: Honor reduced motion for decorative loops, scrolling, polling indicators, and chart transitions. (ticket 018).
- **FR-019**: Show chart time range and point timestamps with a readable summary. (ticket 019).
- **FR-020**: Provide a labeled query field and submit encoded queries to the selected supported search engine. (ticket 020).
- **FR-021**: Keep widget actions independently operable from their containing service launch action. (ticket 021).
- **FR-022**: Distinguish health, last attempt, last success, scheduled next attempt, and in-flight or overdue state; identify timing estimates. (ticket 022).
- **FR-023**: Preserve last-success age after failed attempts and keep visible relative-age descriptions current. (ticket 023).
- **FR-024**: Avoid continuous per-card work solely to animate polling indicators, with no loss of readable timing accuracy. (ticket 024).
- **FR-025**: Apply successful edits immediately after leaving edit mode and during subsequent navigation, without requiring a hard reload. (ticket 025).
- **FR-026**: Keep surviving cards receiving live updates when items are added or removed or refreshed data arrives. (ticket 026).

### Key Entities

- **Dashboard arrangement**: Groups, ordered service items, title, and saved metric preferences.
- **Poll observation**: Service identity, health, attempt time, successful-data time, next scheduled attempt, and activity state.
- **Editor draft**: Unsaved values, validation errors, loading state, and saving outcome.
- **Metric layout**: Ordered visible metrics and hidden metrics with an available restore operation.

## Success Criteria

### Measurable Outcomes

- **SC-001**: All 26 tickets have an implementation task, an acceptance check, and a recorded disposition before the program is declared complete.
- **SC-002**: Every tested edit category remains visible after Done and back/forward navigation without a reload; every tested failure retains a recoverable state.
- **SC-003**: In controlled polling scenarios, displayed last-success timestamps never advance on failure, and visible relative times update within two seconds of elapsed time while the page is active. Exact absolute timestamps remain available.
- **SC-004**: All listed editing, metric, and status journeys complete using keyboard alone; primary touch targets meet the stated 44px dimensions.
- **SC-005**: At 320px and 390px widths and 200% zoom, core forms have reachable actions and no page-level horizontal overflow.
- **SC-006**: A 100-card dashboard remains usable while receiving updates; reduced-motion users see no nonessential continuous animation. Measure processing cost before and after the polling change rather than claiming an unmeasured improvement.

## Assumptions

- This request produces a plan, not application fixes or ticket closures. Priorities sequence delivery; existing ticket priorities remain unchanged.
- Preserve the existing grouped-card visual direction, authentication, and configured data. This is not a redesign or adapter expansion.
- Search will become a query field plus engine choice for Google, DuckDuckGo, and Bing. Preserve recognized existing engine choices; handle unsupported names with explicit fallback messaging. This resolves the ticket's alternatives as a planning default.
- Poll timing refers to the next scheduled attempt, not guaranteed completion. Unknown legacy timing is shown as unknown rather than inferred as successful.
- Target current desktop browsers plus mobile Safari/Chromium; automate where fixtures support it and record manual keyboard, touch, and assistive-technology checks.
- Targeted behavior tests are part of implementation for persistence, polling, drag recovery, async forms, and keyboard controls. Simple wording corrections use inspection instead of redundant tests.
