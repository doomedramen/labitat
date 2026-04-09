# Widget Comparison: Labitat vs Homepage (gethomepage)

## Executive Summary

This document compares the widget implementations between **Labitat** (our project) and **Homepage** (gethomepage) to identify opportunities for bug fixes, improvements, and architectural enhancements.

---

## 1. Architecture Comparison

### Homepage Architecture

- **Framework**: Next.js (Pages Router) with React 19
- **State Management**: SWR for data fetching with built-in caching
- **Widget Structure**:
  - `widget.js` - API configuration and proxy settings
  - `component.jsx` - React component for rendering
  - Shared components in `/src/components/widgets/` and `/src/widgets/glances/components/`
- **Styling**: Tailwind CSS v4 with custom theme classes
- **i18n**: Full internationalization support (next-i18next)
- **Charts**: Recharts v3 for time-series data

### Labitat Architecture

- **Framework**: Next.js (App Router) with React 19
- **State Management**: Custom hooks with fetch API
- **Widget Structure**:
  - `ServiceDefinition<TData>` - Unified adapter pattern with `fetchData()` and either `toPayload()` or `renderWidget()`
  - Widget components in `/src/components/widgets/`
  - Type-safe with TypeScript throughout
- **Styling**: Tailwind CSS with shadcn/ui components
- **i18n**: ❌ **MISSING** - No internationalization support
- **Charts**: Recharts for time-series (GlancesTimeseriesWidget)

### Key Architectural Differences

| Aspect              | Homepage                         | Labitat                 | Impact                                   |
| ------------------- | -------------------------------- | ----------------------- | ---------------------------------------- |
| **Type Safety**     | JavaScript (no types)            | Full TypeScript         | ✅ Labitat wins                          |
| **i18n**            | Full support (15+ languages)     | ❌ None                 | ⚠️ Homepage wins                         |
| **Data Fetching**   | SWR (auto-caching, revalidation) | Manual fetch            | ⚠️ Homepage wins                         |
| **Widget Pattern**  | Separate widget/component files  | Unified adapter pattern | ✅ Labitat wins (cleaner)                |
| **Error Handling**  | Context-based hideErrors         | Per-widget error states | ⚠️ Mixed                                 |
| **Dynamic Loading** | Next.js dynamic imports          | Direct imports          | ⚠️ Homepage wins (better code splitting) |

---

## 2. Widget Coverage Comparison

### Widgets in Homepage (160+ total)

Homepage has **160+ widget implementations** covering:

#### Monitoring & Infrastructure (40+)

- ✅ glances (both have)
- ✅ apcups (both have)
- ✅ pihole (both have)
- ✅ traefik (both have)
- ✅ portainer (both have)
- ✅ grafana (both have)
- ❌ proxmox (both have, but different implementations)
- ❌ unraid
- ❌ truenas
- ❌ openmediavault
- ❌ netdata
- ❌ uptimekuma (both have)
- ❌ healthchecks
- ❌ crowdsec
- ❌ adguard (both have)
- ❌ opnsense
- ❌ pfsense
- ❌ mikrotik
- ❌ fritzbox
- ❌ tailscale
- ❌ cloudflared
- ❌ caddy
- ❌ npm (nginx proxy manager - both have)

#### Media Servers (15+)

- ✅ plex (both have)
- ✅ jellyfin (both have)
- ✅ emby (both have)
- ✅ tautulli (both have)
- ❌ jellystat
- ❌ navidrome
- ❌ audiobookshelf
- ❌ immich (both have)
- ❌ photoprism
- calibreweb (both have)
- ❌ kavita
- ❌ komga
- ❌ romm

#### Download Managers (20+)

- ✅ sonarr (both have)
- ✅ radarr (both have)
- ✅ lidarr (both have)
- ✅ readarr (both have)
- ✅ prowlarr (both have)
- ✅ bazarr (both have)
- ✅ sabnzbd (both have)
- ✅ qbittorrent (both have)
- ✅ transmission (both have)
- ❌ deluge
- ❌ nzbget
- ❌ jackett (both have)
- ❌ ombi
- ❌ overseerr/seerr (both have)
- ❌ pyload
- ❌ rutorrent
- ❌ flood
- ❌ tdarr
- ❌ unmanic (both have)

#### Productivity & Tools (30+)

- ✅ homeassistant (both have)
- ❌ nextcloud
- ❌ paperlessngx
- ❌ vikunja
- ❌ mealie
- ❌ tandoor
- ❌ linkwarden
- ❌ karakeep
- ❌ gitea
- ❌ gitlab
- ❌ freshrss
- ❌ miniflux
- ❌ immich (both have)

#### Specialized (50+)

- ❌ calendar (iCal)
- ❌ stocks
- ❌ speedtest
- ❌ minecraft
- ❌ gamedig
- ❌ coinmarketcap
- ❌ ghostfolio
- ❌ firefly
- ❌ frigate (both have)
- ❌ mystic

### Labitat-Only Widgets

These widgets exist in Labitat but NOT in Homepage:

- ❌ **datetime** - Custom date/time widget
- ❌ **openmeteo** - Weather from Open-Meteo
- ❌ **openweathermap** - Weather from OpenWeatherMap
- ❌ **search** - Search bar widget
- ❌ **matrix** - Matrix chat stats
- ❌ **pipes** - Custom data pipelines
- ❌ **generic-ping** - Generic ICMP ping
- ❌ **generic-rest** - Generic REST API widget

---

## 3. Component-Level Comparison

### 3.1 Stat Display Components

#### Homepage: `Block` Component

```jsx
// Simple positioned text element
export default function Block({ position, label, value, children }) {
  return (
    <div className={`absolute ${position} text-sm`}>
      {children || value || label}
    </div>
  )
}
```

**Features:**

- Absolute positioning within container
- Simple label/value display
- No icons
- No tooltips
- No drag-and-drop

#### Labitat: `StatCard` Component

```typescript
export function StatCard({
  id, value, label, icon, tooltip,
  displayMode, sortable, editMode, ...
})
```

**Features:**

- ✅ Icon support
- ✅ Tooltip support
- ✅ Display modes (icon vs label)
- ✅ Drag-and-drop reordering
- ✅ Unused stat card management
- ✅ Edit mode with drag activators
- ✅ Memoized refs for DnD stability

**Verdict:** ✅ **Labitat wins** - Much more feature-rich and flexible

---

### 3.2 Resource Bar Components

#### Homepage: No equivalent

Homepage does NOT have a dedicated resource bar component. Glances metrics use absolute positioned text blocks.

#### Labitat: `ResourceBar` Component

```typescript
export function ResourceBar({ label, value, hint, warningAt, criticalAt })
```

**Features:**

- ✅ Color-coded thresholds (warning/critical)
- ✅ Progress bar visualization
- ✅ Optional hint text (e.g., "12.4 GB")
- ✅ Smooth transitions
- ✅ Accessible color combinations

**Verdict:** ✅ **Labitat wins** - Homepage lacks this entirely

---

### 3.3 Container/Layout Components

#### Homepage: `Container` Component

```jsx
export default function Container({ children, widget, error, chart }) {
  // Handles error display with hideErrors context
  // Fixed height for chart mode (68px)
}
```

**Features:**

- Context-based error hiding
- Chart mode with fixed heights
- Error state component

#### Labitat: `WidgetContainer` Component

```typescript
export function WidgetContainer({ payload }) {
  // Renders stats, streams, downloads, custom
}
```

**Features:**

- ✅ Unified payload structure
- ✅ Conditional rendering (stats/streams/downloads/custom)
- ✅ Null-safe rendering
- ❌ No built-in error boundary
- ❌ No loading states in container

**Verdict:** ⚠️ **Mixed** - Labitat is more flexible, Homepage has better error handling

---

### 3.4 Active Stream Components

#### Homepage: Jellyfin/Plex Custom Components

- `SingleSessionEntry` - For single stream with expanded layout
- `SessionEntry` - Compact stream entry
- Features:
  - ✅ Media control (play/pause) via API calls
  - ✅ Transcoding info display (direct play vs hardware accel)
  - ✅ Mute status icons
  - ✅ Time progress with ticks-to-time conversion
  - ❌ No tooltip on hover
  - ❌ No sorting by show name

#### Labitat: `ActiveStreamItem` + `ActiveStreamList`

```typescript
export function ActiveStreamItem({
  title,
  subtitle,
  user,
  progress,
  duration,
  state,
})
```

**Features:**

- ✅ Tooltip with full details
- ✅ Auto-sorting by subtitle (show name)
- ✅ Play/pause state icons
- ✅ Remaining time display
- ✅ Progress bar
- ❌ No media control (play/pause buttons)
- ❌ No transcoding info
- ❌ No mute status

**Verdict:** ⚠️ **Mixed** - Labitat has better UX, Homepage has more features

---

### 3.5 Download Progress Components

#### Homepage: `QueueEntry` Component

```jsx
export default function QueueEntry({
  progress, timeLeft, title, activity
})
```

**Features:**

- Progress bar background
- Title with ellipsis
- Activity state text
- Time left display
- Size information

#### Labitat: `DownloadItem` + `DownloadList`

```typescript
export function DownloadItem({ title, progress, timeLeft, activity, size })
```

**Features:**

- ✅ All Homepage features
- ✅ Tooltip with combined info
- ✅ Better layout (flexbox vs absolute positioning)
- ✅ Size prefix in activity text

**Verdict:** ✅ **Labitat wins** - Slightly better implementation

---

### 3.6 Chart Components

#### Homepage: `Chart` + `ChartDual`

```jsx
// Single metric chart
export default function Chart({
  dataPoints, label, formatter
})

// Dual metric chart (used/memory)
export default function ChartDual({
  dataPoints, max, label, formatter
})
```

**Features:**

- ✅ Recharts-based
- ✅ Configurable data points limit
- ✅ Custom formatter functions
- ✅ i18n labels
- ✅ Dual-axis support
- ❌ No gradient fills
- ❌ No custom tooltips

#### Labitat: `GlancesTimeseriesWidget`

```typescript
export function GlancesTimeseriesWidget({ history })
```

**Features:**

- ✅ Recharts-based
- ✅ Gradient fills (linear gradients)
- ✅ Custom tooltip component
- ✅ Auto-scaling Y-axis (rounded to nearest 10)
- ✅ Manual Y-axis labels (max, mid, 0)
- ✅ Legend with live values
- ❌ No dual-axis support
- ❌ No configurable data points
- ❌ Hardcoded to CPU/MEM only

**Verdict:** ⚠️ **Mixed** - Labitat has better visuals, Homepage is more flexible

---

## 4. Bug Fixes & Improvements Identified

### 4.1 Critical Bug Fixes

#### ❌ BUG: No Error Boundary in WidgetContainer

**Homepage**: Has context-based error handling with `hideErrors` setting
**Labitat**: Each widget handles errors individually, no centralized error boundary

**Fix**: Add error boundary wrapper in `WidgetRenderer` or `WidgetContainer`

```typescript
// Add to WidgetContainer
if (payload.error) {
  if (hideErrors) return null;
  return <WidgetError error={payload.error} />;
}
```

---

#### ❌ BUG: GlancesTimeseriesWidget Hardcoded Metrics

**Homepage**: Supports CPU, memory, disk, network, GPU, filesystem, sensors, containers
**Labitat**: Only supports CPU and memory

**Fix**: Make metric selection configurable

```typescript
type MetricConfig = {
  key: "cpu" | "mem" | "disk" | "network" | "gpu"
  label: string
  color: string
}
```

---

#### ❌ BUG: No Loading States in Widgets

**Homepage**: Skeleton loaders during initial fetch
**Labitat**: Only shows "Waiting for data..." text

**Fix**: Add skeleton loader component

```typescript
export function WidgetSkeleton({ rows = 3 }) {
  return (
    <div className="space-y-2">
      {Array.from({ length: rows }).map((_, i) => (
        <Skeleton key={i} className="h-6 w-full" />
      ))}
    </div>
  );
}
```

---

### 4.2 Feature Improvements

#### ⚡ IMPROVEMENT: Add Media Control to ActiveStreamItem

**Homepage**: Jellyfin component has play/pause buttons that call API
**Labitat**: Only shows state icon

**Fix**: Add optional `onTogglePlayback` callback

```typescript
export function ActiveStreamItem({
  ...,
  onTogglePlayback?: (streamId: string) => void;
  streamId?: string;
})
```

---

#### ⚡ IMPROVEMENT: Add Transcoding Info to ActiveStreamItem

**Homepage**: Shows direct play vs hardware acceleration icons
**Labitat**: No transcoding information

**Fix**: Extend `ActiveStream` type

```typescript
export type ActiveStream = {
  // ... existing fields
  transcoding?: {
    isDirect: boolean
    hardwareDecoding: boolean
    hardwareEncoding: boolean
  }
}
```

---

#### ⚡ IMPROVEMENT: Add i18n Support

**Homepage**: Full i18n with next-i18next (15+ languages)
**Labitat**: All strings hardcoded in English

**Fix**: Add translation utility layer

```typescript
// Use next-intl or react-i18next
import { useTranslations } from '@/lib/i18n';

const t = useTranslations('widgets.glances');
<ResourceBar label={t('cpu')} value={cpuPercent} />
```

---

#### ⚡ IMPROVEMENT: Add SWR-like Data Fetching

**Homepage**: Uses SWR for automatic caching, revalidation, deduplication
**Labitat**: Manual fetch with custom hooks

**Fix**: Integrate SWR or React Query

```typescript
// Instead of manual fetch in adapters
const { data, error, isLoading } = useSWR(
  ["glances", config.url],
  () => fetchData(config),
  { refreshInterval: config.pollingMs }
)
```

---

#### ⚡ IMPROVEMENT: Add Chart Configuration Options

**Homepage**: Configurable `pointsLimit`, `refreshInterval`, `chart` toggle
**Labitat**: Hardcoded values

**Fix**: Add widget options

```typescript
type ChartOptions = {
  enabled: boolean
  pointsLimit: number
  refreshInterval: number
  metrics: string[]
  showLegend: boolean
  showGrid: boolean
}
```

---

#### ⚡ IMPROVEMENT: Add Process Status Icons

**Homepage**: Glances processes show status icons (R/S/D/Z/T/X)
**Labitat**: Only shows text

**Fix**: Add status icon mapping

```typescript
const statusIcons = {
  R: <Circle className="text-green-500" />,  // Running
  S: <Circle className="text-blue-500" />,   // Sleeping
  Z: <AlertTriangle className="text-red-500" />, // Zombie
};
```

---

#### ⚡ IMPROVEMENT: Add "Now Playing" Expansion

**Homepage**: Jellyfin can expand single stream to two rows
**Labitat**: All streams same size

**Fix**: Add conditional layout

```typescript
if (streams.length === 1 && expandSingleStream) {
  return <ExpandedStreamView stream={streams[0]} />;
}
```

---

#### ⚡ IMPROVEMENT: Add Download Queue Sorting

**Homepage**: Sonarr sorts downloads by progress (downloading first)
**Labitat**: No sorting

**Fix**: Auto-sort by progress

```typescript
const sorted = [...downloads].sort((a, b) => {
  if (a.activity === "Downloading" && b.activity !== "Downloading") return -1
  return b.progress - a.progress
})
```

---

#### ⚡ IMPROVEMENT: Add Widget-Specific Error Messages

**Homepage**: Generic error icon for all failures
**Labitat**: Shows raw error text

**Fix**: Standardize error messages

```typescript
type WidgetError = {
  type: "network" | "auth" | "timeout" | "parse"
  message: string
  retryable: boolean
}
```

---

#### ⚡ IMPROVEMENT: Add ResourceBar Dual Metric

**Homepage**: ChartDual shows used vs free
**Labitat**: ResourceBar only shows single metric

**Fix**: Add dual-mode ResourceBar

```typescript
export function ResourceBarDual({
  label,
  used,
  total,
  showFree?: boolean;
})
```

---

## 5. Missing Widgets Worth Implementing

### High Priority (Commonly Used)

1. **jellystat** - Jellyfin statistics (better than basic jellyfin widget)
2. **pihole** - DNS query stats, blocked domains
3. **nextcloud** - Storage, users, files stats
4. **calendar** - Upcoming events from iCal
5. **speedtest** - Internet speed test results
6. **unraid** - Array status, disk temps, parity
7. **truenas** - Pool status, disk health
8. **navidrome** - Active streams, library stats

### Medium Priority (Nice to Have)

9. **audiobookshelf** - Active listeners, library stats
10. **kavita/komga** - Reading progress, library stats
11. **deluge** - Alternative torrent client
12. **nzbget** - Alternative Usenet client
13. **freshrss/miniflux** - Unread feed counts
14. **vikunja** - Task management stats
15. **mealie/tandoor** - Recipe management stats

### Low Priority (Specialized)

16. **minecraft** - Server status, player count
17. **stocks** - Stock portfolio tracking
18. **coinmarketcap** - Crypto prices
19. **ghostfolio** - Investment portfolio
20. **gamedig** - Game server status

---

## 6. Recommended Action Plan

### Phase 1: Critical Fixes (Week 1-2)

- [ ] Add error boundary to WidgetContainer
- [ ] Add skeleton loading states
- [ ] Fix GlancesTimeseriesWidget to support configurable metrics
- [ ] Add download queue sorting

### Phase 2: Feature Parity (Week 3-4)

- [ ] Add media control to ActiveStreamItem (play/pause)
- [ ] Add transcoding info display
- [ ] Add process status icons to GlancesProcesses
- [ ] Add ResourceBarDual component

### Phase 3: Architecture Improvements (Week 5-6)

- [ ] Integrate SWR or React Query for better data fetching
- [ ] Add i18n support (next-intl recommended)
- [ ] Add widget configuration options (chart settings)
- [ ] Add single-stream expanded view

### Phase 4: New Widgets (Week 7-8)

- [ ] Implement pihole widget
- [ ] Implement jellystat widget
- [ ] Implement nextcloud widget
- [ ] Implement calendar widget
- [ ] Implement speedtest widget

---

## 7. Code Quality Comparison

### TypeScript Coverage

- **Homepage**: 0% (all JavaScript)
- **Labitat**: 100% TypeScript
- **Winner**: ✅ Labitat

### Test Coverage

- **Homepage**: Has test files for most widgets (vitest + testing-library)
- **Labitat**: Has tests for most adapters (vitest)
- **Winner**: ⚖️ Tie

### Documentation

- **Homepage**: Minimal inline comments, no JSDoc
- **Labitat**: JSDoc comments, clear type definitions
- **Winner**: ✅ Labitat

### Code Organization

- **Homepage**: Separate files per widget (widget.js, component.jsx)
- **Labitat**: Unified adapter pattern (single file per service)
- **Winner**: ✅ Labitat (cleaner separation of concerns)

---

## 8. Performance Considerations

### Homepage Advantages

- SWR provides automatic request deduplication
- SWR caches responses across components
- Dynamic imports reduce initial bundle size
- Next.js Pages Router has faster TTFB than App Router

### Labitat Advantages

- TypeScript catches errors at compile time
- Memoized DnD refs prevent unnecessary re-renders
- Conditional rendering avoids fetching unused data
- App Router enables React Server Components (future optimization)

---

## 9. Accessibility Comparison

### Homepage

- ❌ No ARIA labels on widget components
- ❌ No keyboard navigation for media controls
- ❌ Color-only indicators (no icons for status)
- ✅ Semantic HTML structure

### Labitat

- ✅ `sr-only` text for icon-only elements
- ✅ Tooltip fallbacks for truncated text
- ✅ Color + icon combinations for status
- ✅ Proper ARIA attributes on DnD components
- ✅ Keyboard-accessible stat cards

**Winner**: ✅ Labitat

---

## 10. Summary

### Where Labitat Excels

✅ Type-safe TypeScript throughout
✅ Better component architecture (unified adapter pattern)
✅ Superior StatCard with DnD reordering
✅ ResourceBar with color-coded thresholds
✅ Better accessibility (sr-only, ARIA, tooltips)
✅ Cleaner code organization
✅ Better documentation

### Where Homepage Excels

✅ 160+ widget implementations
✅ Full i18n support
✅ SWR for automatic caching/revalidation
✅ Media control (play/pause) in stream widgets
✅ More Glances metrics (GPU, disk, network, sensors)
✅ Configurable chart options
✅ Better error handling (context-based)
✅ Skeleton loading states

### Priority Recommendations

1. **Fix critical bugs** (error boundaries, loading states)
2. **Add missing features** (media control, transcoding info)
3. **Integrate SWR** for better data fetching
4. **Add i18n** for international users
5. **Implement high-demand widgets** (pihole, jellystat, nextcloud)

---

## Appendix: Widget Feature Matrix

| Widget             | Homepage                           | Labitat                     | Notes                                    |
| ------------------ | ---------------------------------- | --------------------------- | ---------------------------------------- |
| Glances CPU        | ✅ Chart + quicklook               | ✅ ResourceBar              | Homepage has chart, we have better bar   |
| Glances Memory     | ✅ Chart dual (used/free)          | ✅ ResourceBar              | Homepage shows free, we don't            |
| Glances Processes  | ✅ Status icons + bytes            | ⚠️ Text only                | Missing icons, shows % not bytes         |
| Glances Timeseries | ✅ Configurable                    | ⚠️ CPU/MEM only             | Homepage supports more metrics           |
| Plex               | ✅ Stats only                      | ✅ Stats + streams          | We have active streams, Homepage doesn't |
| Jellyfin           | ✅ Stats + streams + media control | ❌ Not implemented          | Homepage has full media control          |
| Sonarr             | ✅ Stats + queue                   | ✅ Stats + downloads        | Equivalent functionality                 |
| Radarr             | ✅ Stats + queue                   | ✅ Stats + downloads        | Equivalent functionality                 |
| Transmission       | ✅ Stats (leech/seed/rates)        | ✅ Stats (leech/seed/rates) | Equivalent                               |
| qBittorrent        | ✅ Stats + downloads               | ✅ Stats + downloads        | Equivalent                               |
| Tautulli           | ✅ Stats + streams                 | ✅ Stats + streams          | Equivalent                               |
| AdGuard            | ✅ Stats (queries/blocked)         | ✅ Stats (queries/blocked)  | Equivalent                               |
| Proxmox            | ✅ Stats (VMs/containers)          | ✅ Stats (VMs/containers)   | Equivalent                               |
| Unifi              | ✅ Stats (devices/clients)         | ✅ Stats (devices/clients)  | Equivalent                               |
