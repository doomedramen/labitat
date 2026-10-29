# Whisparr V3 API verification

Verified 2026-10-29 against Whisparr-eros `eros` branch (the installed instance's exact build has not been verified).

- `/api/v3/movie` returns a bare array of movie resources, including scenes. Its all-library path computes statistics and maps metadata for the entire library, so it is potentially expensive. [Movie controller](https://github.com/Whisparr/Whisparr-eros/blob/eros/src/Whisparr.Api.V3/Movies/MovieController.cs).
- `/api/v3/queue` supplies a paging response. [Queue controller](https://github.com/Whisparr/Whisparr-eros/blob/eros/src/Whisparr.Api.V3/Queue/QueueController.cs).
- `/api/v3/wanted/missing` and `/api/v3/wanted/cutoff` return paging resources. [Missing controller](https://github.com/Whisparr/Whisparr-eros/blob/eros/src/Whisparr.Api.V3/Wanted/MissingController.cs), [cutoff controller](https://github.com/Whisparr/Whisparr-eros/blob/eros/src/Whisparr.Api.V3/Wanted/CutoffController.cs).

These routes and shapes agree with the current adapter; this does not establish that the live widget's requests succeed. The provided logs do not contain the failing request. Authentication, timeout, HTTP and validation failures were previously all hidden behind a generic cached-data warning. Safe failure categories now distinguish them without exposing URLs, keys or response bodies. Whisparr timeout exceptions retain their type.

Do not claim a root cause or change endpoint semantics without the live error. Full-library response cost is a hypothesis, not a confirmed cause.
