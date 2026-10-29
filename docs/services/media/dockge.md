# Dockge

Shows **Containers** and **Running** for the Docker host managed by Dockge. Includes stopped and standalone containers in the total. Refreshes every 30 seconds.

Dockge's own API exposes stack summaries, not a reliable total of all containers. This widget therefore reads Docker Engine's `GET /info` endpoint. Set **Docker API / socket proxy URL** to an existing Docker endpoint or a socket proxy reachable from Labitat, with read access to `/info`. An optional API version prefix in the URL is supported. Keep your item's launch link pointed at Dockge.

The Dockge web URL and Dockge login credentials cannot supply these counts. No new proxy or Docker listener is configured automatically. Prefer an internal proxy limited to the required read endpoint; do not expose an unrestricted Docker API publicly.

Counts cover one Docker host per widget. For Dockge installations with multiple agents, configure a widget per Docker host. The widget returns only the two aggregate counts, and reports errors for unavailable or malformed responses.

[API research](../../research/dockge-api.md).
