# Live-state contract

## Existing interface

`GET /api/events` is an event stream with update and reconnect messages. Extend it compatibly; retain existing update keys while introducing nullable metadata. Do not replace all consumers in one step without fixtures proving legacy payload acceptance.

## Proposed messages

- **update**: Existing itemId, widgetData, pingStatus, and fetchedAt remain; fetchedAt is retained as a legacy observation timestamp, not described as last success. Add configurationRevision, observationUpdatedAt, lastAttemptAt, lastSuccessAt, and freshness. All timestamps are epoch milliseconds or null where unknown.
- **poll-state**: itemId, configurationRevision, serverNow, pollState, nextPollAt, effectiveIntervalMs. This describes the current scheduler, including queued and in-flight periods; it does not overwrite metric data.
- **reconnect**: Existing shape retained. Browser immediately considers schedule confidence unverified until reconnection state is established.

Deliver an initial current snapshot/schedule on connection and subsequent schedule changes at request start/completion, interval changes, and idle/resume. Avoid an SSE message per clock tick; the browser derives countdown text locally. Bound broadcasts to meaningful state changes.

## Ordering and compatibility

New browser accepts legacy update messages with timing fields unknown. Old browser ignores new event types while retaining existing update handling. New server must not remove legacy keys during this remediation. Server-stamped observation ordering and configuration identity protect against stale results; client receipt time cannot serve as data freshness. Initial seed and live updates must use the same normalization.

A configuration-changing mutation must invalidate the old observation generation before a replacement poll can publish. Unknown metadata is displayed honestly rather than treated as success. On restart, persisted success age survives; volatile next-poll state is regenerated.

## Indicator behavior

| State             | Visible/disclosed behavior                                         |
| ----------------- | ------------------------------------------------------------------ |
| Never verified    | “No successful poll yet”; no fake countdown                        |
| Scheduled         | “Next attempt in …”; timestamp accessible; ring is supplemental    |
| Queued            | “Waiting to poll”; no promised finish time                         |
| Polling           | “Polling…”; retain previous last-success time                      |
| Failure with data | “Showing older data”; last attempt and last success separately     |
| Connection lost   | “Live updates disconnected”; schedule unverified                   |
| Past-due schedule | “Poll overdue” or “Waiting for update”; never a negative countdown |
| Reduced motion    | Static state, same text and actions                                |

One focusable status trigger per card has a useful accessible name. Tap, click, Enter, or Space opens details; Escape closes and returns focus. It sits outside the service launch anchor. Announce meaningful connection/failure changes, not every countdown tick. Relative time refreshes within two seconds while visible; absolute times include timezone context.

## Required contract checks

Legacy payload acceptance; failed attempts preserve last success; fresh degraded data semantics; slow and queued polls; clock skew; initial failure; tab resume; same-ID config changes; late old-generation events; removed IDs; surviving listeners; SSE reconnect; restart with a legacy cache row. Verify schema, server publisher, seed snapshots, and browser consumer together.
