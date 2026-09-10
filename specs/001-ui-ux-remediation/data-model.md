# Data model and state transitions

These are proposed implementation contracts. Existing data must remain readable; no migration has been performed.

## Dashboard arrangement

Existing group IDs, item IDs, groupId/order, title, and stat preferences remain authoritative in SQLite. A cross-group move updates source and destination ordering in one transaction, validates IDs and ownership/access, then invalidates view/edit data. Layout mutations are serialized in the editor so rollback cannot discard a newer successful edit.

**Configuration identity**: Add an opaque nonsecret configuration revision per item, or an equivalent tested generation mechanism. Proposed persistent representation is an integer incremented when service type, endpoint, or service config changes. Do not derive a public fingerprint directly from credentials. Return the revision with structural snapshots and live observations. A poll captures it at start; discard results if configuration changed before completion. Presentation-only changes do not require discarding good metrics.

## Cached observation

| Field                   | Meaning                                                  | Persistence                                                     |
| ----------------------- | -------------------------------------------------------- | --------------------------------------------------------------- |
| itemId                  | Existing item identity                                   | Existing                                                        |
| configurationRevision   | Configuration that produced these values                 | Additive                                                        |
| widgetData / pingStatus | Most recent useful data and health outcome               | Existing                                                        |
| observationUpdatedAt    | When this observation/health state changed               | Additive or explicit normalization of existing cache write time |
| lastAttemptAt           | Start of the most recent actual request                  | Additive nullable timestamp                                     |
| lastSuccessAt           | Most recent successful fresh observation                 | Additive nullable timestamp                                     |
| freshness               | fresh, stale, or unknown, independent of health severity | Derived from normalized outcome and provenance                  |

Legacy rows with no provenance retain their metrics but have unknown success time. Do not equate SQLite updatedAt with verified success. The first confirmed successful observation establishes lastSuccessAt. Add columns through Drizzle migration if needed; retain old columns while deployed clients may still read them. New fields are nullable/defaulted so old databases remain readable during upgrade. Clear incompatible cached observations after service configuration changes.

A resolved adapter request can return `_status: error` or cached values. Success classification must reflect whether fresh data was actually acquired; degraded but fresh data may still count as success. Do not infer this solely from promise resolution or assume every warning is stale. Document normalized provenance at the polling/cache boundary, adding a backward-compatible internal result flag only where existing adapter status is insufficient.

## Poll schedule (volatile)

| Field                          | Meaning                                                                    |
| ------------------------------ | -------------------------------------------------------------------------- |
| itemId / configurationRevision | Poll target generation                                                     |
| pollState                      | unknown, scheduled, queued, polling, or paused                             |
| nextPollAt                     | Earliest scheduled attempt; null when unavailable                          |
| effectiveIntervalMs            | Actual interval after idle/config rules                                    |
| serverNow                      | Timestamp used to interpret scheduling without trusting browser wall clock |

Queued means due but blocked by concurrency; polling means a request is active. Overdue is a display state when a scheduled attempt is past due and no newer state is known. A lost connection makes the schedule unverified, not a confirmed paused server. Do not persist in-flight or next-poll state across restarts; reload cached observations and rebuild scheduling.

**Transitions**: scheduled → queued/polling → scheduled; polling failure changes health/freshness and attempt metadata but preserves lastSuccessAt. Disconnect affects browser confidence independently of service health. Idle/resume changes effective schedule and emits updated timing.

## Browser live state

Reconcile membership independently from observation versions. Add new IDs, remove deleted IDs, retain subscribers for surviving IDs, and notify changed snapshots. For the same configuration, do not replace a newer live observation with an older server snapshot. A new configuration revision invalidates old observations, even when item ID is unchanged. Initialize missing metadata as unknown and keep the server hydration getter current. Late events for removed IDs or old revisions cannot recreate stale state.

Clock-derived text is not stored as observation data. Use a shared clock and server-time offset; recompute on resume. Snapshot replacement and subscription registration must remain compatible with React's external-store contract and Strict Mode.

## Editor draft

States: loading, load-error, ready-clean, ready-dirty, submitting, submit-error, closed. Each async load is scoped to item ID, service type, and open generation. Loading defaults establishes the clean baseline; stale responses never modify the current draft. Submission failure retains values; successful submission updates the baseline then closes. Dismissal of a dirty draft requires an explicit discard choice. Dismissal during an unresolved save must not obscure its outcome.

## Metric layout

Existing `{ active: string[], unused: string[] }` remains the stored form. Normalize against available metrics: IDs are unique, nonexistent IDs removed, and new IDs follow adapter defaults. When explicit user layout exists, preserve existing order; append newly active defaults deterministically. Empty active arrays remain valid and have a restore control. One normalization function serves editor and view.

## Search configuration

Keep existing comma-separated engine names readable. Normalize supported names case-insensitively to Google, DuckDuckGo, or Bing; preserve recognized order. Unsupported names receive a visible fallback explanation and remain editable. Blank queries do not navigate. Search terms use encoded query parameters, not raw interpolation. No secret or new account entity is introduced.
