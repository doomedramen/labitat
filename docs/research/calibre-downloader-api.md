# Shelfmark (Calibre Downloader) API research

Verified 2026-10-29 against the **v1.5.1 tag** in `calibrain/shelfmark`, matching the version reported from the user’s live UI. The previous project name was calibre-web-automated-book-downloader; use Shelfmark naming for this release.

## Recommended endpoint

`GET /api/stats` is specifically designed for dashboard counters. It returns aggregate counts only, without book titles or usernames. [v1.5.1 route](https://github.com/calibrain/shelfmark/blob/v1.5.1/shelfmark/main.py), [counter implementation](https://github.com/calibrain/shelfmark/blob/v1.5.1/shelfmark/core/stats.py).

```json
{
  "generated_at": "2026-10-29T12:00:00+00:00",
  "added": {
    "ebook_7d": 0,
    "audiobook_7d": 0,
    "total_7d": 0,
    "ebook_30d": 0,
    "audiobook_30d": 0,
    "total_30d": 0
  },
  "queue": { "active": 0, "awaiting_pickup": 0, "queued": 0 },
  "requests": { "pending": 0, "delivered": 0, "failed": 0, "cancelled": 0, "rejected": 0 },
  "errors": { "failed_7d": 0 }
}
```

All counter fields are integer counts from database COUNT queries; `generated_at` is an ISO timestamp. Added counts are successful downloads in rolling 7/30-day UTC windows. `queue.active` counts download-history rows with `final_status = active`; `queue.queued` counts request records with `delivery_state = queued`; `awaiting_pickup` counts pending requests whose delivery state is none. These are distinct counters rather than parts of a guaranteed partition. `requests.pending` includes all pending requests. Failed requests is lifetime request delivery failures; `errors.failed_7d` is failed download history within seven days. [Exact queries](https://github.com/calibrain/shelfmark/blob/v1.5.1/shelfmark/core/stats.py).

Suggested default widget: Active, Queued, Added (7d), Failed (7d). Optional extra stats can expose Pending requests and Added (30d).

## Authentication

- Pass `X-Api-Key: <key>` or `Authorization: Bearer <key>`.
- Prefer the dedicated environment variable **`SHELFMARK_API_KEY_READONLY`**. This credential reaches only `GET /api/stats`; other API routes return 403.
- Existing admin `SHELFMARK_API_KEY` also authenticates but grants broader upstream privileges.
- When the app auth mode is `none`, credentials are unnecessary.
- An authenticated admin web session also reaches stats, but there is no need for a session login when configuring this dashboard widget.
- Missing or unmatched key with no admin session: 401. Authenticated non-admin session: 403. Unavailable user DB: 503. SQLite errors: 500.
- [API key parsing and scope](https://github.com/calibrain/shelfmark/blob/v1.5.1/shelfmark/core/api_key.py), [request middleware and stats authorization](https://github.com/calibrain/shelfmark/blob/v1.5.1/shelfmark/main.py).

## Why not `/api/status`

`GET /api/status` is the detailed current download queue, authenticated through normal login/admin-key paths. The read-only dashboard key deliberately cannot access it. A stats widget should avoid fetching or returning this potentially sensitive per-download detail. [Status route and readonly allowlist](https://github.com/calibrain/shelfmark/blob/v1.5.1/shelfmark/main.py).

## Verification cases

Correct base URL and URL prefix; API key header supplied/absent; normal and all-zero counters; no book/user detail returned; distinction between failed requests and failed downloads (7d); missing/null nested objects; malformed numeric counters; HTTP 401/403/500/503; invalid JSON/network failure. Older versions without `/api/stats` should report endpoint incompatibility rather than silently substituting zeros.
