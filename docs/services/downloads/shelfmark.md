# Shelfmark (Calibre Downloader)

Supports Shelfmark's aggregate `/api/stats` endpoint, available in v1.5.1. Older Calibre Web Automated Book Downloader versions without this endpoint are not supported.

Shows active downloads, queued downloads, items awaiting pickup, books added in the last seven days, pending requests, and failures in the last seven days. Refreshes every 30 seconds. Queue counts and historical counts have different time windows; completed history is not inferred from the current queue.

Enter your instance URL (including any URL base). For authenticated servers, configure `SHELFMARK_API_KEY_READONLY` on the Shelfmark server and enter that value as the widget's API key. The administrator `SHELFMARK_API_KEY` also works. Leave blank only when Shelfmark authentication is disabled. Browser session cookies are not used.

This widget makes one read-only request per poll. Authentication failures, unsupported API versions, and malformed responses display an error.

[API research and upstream sources](../../research/calibre-downloader-api.md).
