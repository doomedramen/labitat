# Performance

The [compact operator dashboard](./operator-dashboard.md) keeps the overview small and moves investigation into details.

## Rendering

Next.js renders group order, launch links, labels, and cached metric values on the server. Known stale data is marked using the server snapshot time; legacy data with no successful-update time stays unknown. Hydration preserves newer live observations.

Tiles subscribe to their own observations through an external store. Opening a service panel does not render the other tiles again. A 100-service regression fixture checks this behavior. One shared visible clock updates freshness and pauses when the document is hidden. Specialized charts, process lists, utility animations, and historical queries mount only inside an open details panel.

The 24-service, three-group browser fixture fits a 1440 × 900 viewport. Metric rows are 80px tall with a fine pointer and 96px on phones or touch screens; launcher rows use 56px and 60px respectively. Up to four metrics share one horizontal band. Whole group panels occupy two columns at 768px, three at 1200px, and four at 1720px. A single group uses the available width with multiple service columns. Structural configuration determines placement; observations cannot change row height or move panels.

## Polling and history

One Node polling supervisor starts through instrumentation. Connected dashboard clients share its observations over SSE; additional tabs do not create polling loops. The supervisor limits concurrency to 15 service requests. With no connected dashboards, each service uses the greater of its configured interval and 60 seconds. Slower intervals stay slower.

SQLite stores at most one successful numeric sample per service per minute, with 24-hour retention and separate health transitions. The same scheduler performs retention maintenance; failed requests and downtime produce gaps. History queries return no more than 1,440 minute positions and run only while details are open. Visible panels refresh once a minute and pause when hidden.

## Caching

The server persists observations with successful-update time, attempt time, freshness, and configuration revision. A failed attempt preserves the previous observation's age. Obsolete asynchronous results cannot overwrite observations from a newer configuration.

The service worker caches static assets, fonts, and icons. HTML, Next page-data responses, and live/history APIs always use the network. Offline navigation shows the offline page; it does not replay a cached dashboard as current data.

## Deployment

Use one always-on Node instance with the existing SQLite volume, WAL mode, and encryption key. Configure polling intervals to match how quickly each service changes. History collection stops while Node is stopped and does not invent observations on restart. See the [operator guide](./operator-dashboard.md#deployment) for migration requirements.
