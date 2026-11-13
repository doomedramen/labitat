# Operator dashboard

The overview presents services in cards grouped by category. Phones use one vertical list; wider screens use two, three, or four service columns in each group. Saved reading order stays stable, and live data never moves panels. Services show up to four selected metrics, a card-wide launch link, and a separate **Inspect** button over the metrics. Hover, focus, or tap a service status indicator to see its health and any failure, warning, or stale reason. Services without metrics offer **Service details** in the status popup. Missing observations show **Data unavailable** there rather than invented zeroes.

**Live activity** shows available downloads and streams above the groups, with their source service and any supplied progress, playback state, speed, or remaining time. On phones, an idle state is condensed into one row; active lists and source problems remain visible. The overview shows up to two entries per list; expand it to see the rest of the available observations. Some services limit the number of entries they supply. Activity respects each service's display settings, and stale or failed sources are identified rather than presented as current activity. Select an activity entry to inspect its source.

## Find and inspect

Search matches service names, adapter names, and groups. Press `/` or `⌘/Ctrl+K` to focus it. Use the group picker to narrow services and activity to one group. **All**, **Needs attention**, and **Stale** count services; a service can need attention and be stale at the same time. Filtering and live updates never save a different order.

Inspect opens a 440px side panel on desktop or a full-screen sheet below 768px. The URL's `service` parameter restores the panel after refresh and supports browser Back/Forward. Closing returns keyboard focus to the tile. Full metric values, activity, history, and update diagnostics live here. Date/time runs locally; specialized Glances charts/process tables and decorative widgets run only when inspected. The search utility sends the entered query to the selected supported search engine.

## Configure and arrange

Sign in and choose **Manage → Arrange dashboard**. Drag the real rows or open a row’s Arrange menu for earlier/later controls and the destination-group selector. Live observations continue. **Save arrangement** commits group order, service order, and group membership in one transaction. **Cancel** discards the local draft without writing. Concurrent structural changes are rejected; a failed save preserves the draft for retry. Existing `/edit` links redirect into authenticated Arrange mode.

Service configuration is separate: **Inspect → Configure**. Identity, connection settings, and metrics remain independent of arrangement. Metric controls support Show, Hide, earlier/later movement, and optional dragging. The first four shown metrics appear on the tile; additional explicitly shown metrics appear in details and are eligible for history. New metrics stay in Unused. Existing selections and IDs are retained. Light and Dark are the only themes.

## History and freshness

One always-on Node process collects observations through the existing polling supervisor, with the existing 15-request concurrency limit. Next's Node instrumentation starts it once, including before any dashboard is opened. Build and edge runtimes do not collect. With no connected dashboards, each service polls once per idle window (10 minutes by default, set with `IDLE_POLLING_INTERVAL_MINUTES`). Services get evenly spaced slots across the window, so idle polling never requests every service at once. Slower configured intervals stay slower. A dashboard tab counts as connected only while someone is using it: it disconnects 30 seconds after being hidden, or after 15 minutes without input, and reconnects with an immediate refresh as soon as it is shown or used again.

SQLite retains the most recent 24 hours. Each service records at most one successful sample per minute, containing only its selected numeric metrics, including selected metrics beyond the first four. Native numbers and canonical units are stored directly. Formatted strings, ambiguous ratios, cached values, and failures do not create measurements. Adapters can supply explicit `_numeric` observations or the serializable `toMetrics` contract. Existing adapters use a compatibility normalizer that strips their CSS and JSX from overview metrics.

History starts empty. Restart, failure, and downtime gaps remain gaps. Configuration revisions and changes in unit separate incompatible observations. Health transitions are stored separately; identical repeated failures are not new incidents. Retention is enforced on reads and cleaned at startup and hourly by the same scheduler.

The details panel requests `GET /api/items/:id/history?metric=cpu&range=1h` only while open, refreshes once a minute while visible, and pauses when hidden. Ranges are `1h`, `6h`, and `24h`; responses include at most 1,440 minute positions (null for gaps), plus health transitions. Responses use `Cache-Control: no-store` and the same public read permissions as the dashboard. No credentials or raw service responses are included.

The service worker caches static assets and icons. API responses, HTML navigation, and Next page-data responses always reach the network; offline navigation shows the offline page instead of an old dashboard snapshot.

## Deployment

Apply the additive migration `drizzle/0008_operator_dashboard.sql` using the existing migration workflow before starting the upgraded Node server. It adds history tables and dashboard revisions; it preserves credentials, URLs, groups, metric selections, and configuration. `db:push` deployments also initialize the revision triggers at Node startup. Keep the existing SQLite volume and `SECRET_KEY`. Collection assumes one always-on Node instance; it does not backfill time when the process was stopped.
