# Performance

Labitat is designed to be lightweight and run on modest hardware.

## Page Load

Labitat uses Next.js App Router with server-side rendering. The initial page load renders on the server, so the HTML arrives fully formed — no client-side JavaScript is required for the first paint.

- **First paint**: The dashboard shell renders immediately from server HTML
- **Hydration**: React hydrates the page client-side after the initial HTML arrives
- **Flash of content**: Widget cards appear with their last-cached data (or loading skeletons) — no blank screen flash

## Widget Loading

Widgets load data **client-side** via SWR (stale-while-revalidate):

1. On first load, widgets show a loading state while fetching from their configured service
2. Once data arrives, it's displayed and cached
3. On subsequent visits, cached data shows immediately while a fresh fetch happens in the background
4. Each widget polls independently at its configured interval (default: 10 seconds)

This means:

- **No server-side background polling** — the server only handles requests when clients ask
- **No flash of missing content** — cached data displays while fresh data loads
- **Multiple tabs** each poll independently (no shared state between tabs)

## PWA Offline Behavior

- Static assets (JS, CSS, icons) are cached on first visit
- HTML pages use network-first strategy with cache fallback
- API calls use network-first with cache fallback
- When offline, cached pages render but widget data may be stale
- Service worker checks for updates every hour

## Database

Labitat uses SQLite (better-sqlite3) with WAL mode enabled by default. The database is small — a fresh install with migrations applied is approximately **48 KB**. It grows linearly with users, widget groups, and settings entries.

## Optimization Tips

1. **Use a reverse proxy** (Traefik, Nginx) for HTTPS and compression
2. **Set appropriate polling intervals** — don't poll more frequently than needed
3. **Limit widget count** — each widget adds a small amount of client-side overhead
4. **Use SQLite WAL mode** (enabled by default) for better concurrent read performance
5. **Keep SECRET_KEY backed up** — losing it requires re-entering all service credentials
