# Media Adapters Comparison: Labitat vs Homepage

> Generated: 2026-04-09
> Labitat adapters: `/src/lib/adapters/`
> Homepage widgets: `/homepage/src/widgets/`

---

## Summary Table

| Feature                             | Plex                               | Tautulli                                                      | Emby                                                                                                        | Jellyfin                                                                                                    |
| ----------------------------------- | ---------------------------------- | ------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------------------------------------- |
| **Stats blocks**                    | 4 (streams, albums, movies, shows) | 5 (streams, bandwidth, transcode, direct play, direct stream) | 4 (active, movies, shows, episodes)                                                                         | 4 (active, movies, shows, episodes)                                                                         |
| **Active stream list**              | Yes (optional)                     | Yes                                                           | **No**                                                                                                      | **No**                                                                                                      |
| **Media controls (pause/unpause)**  | No                                 | No                                                            | No                                                                                                          | No                                                                                                          |
| **Transcoding indicators**          | No                                 | No                                                            | No                                                                                                          | No                                                                                                          |
| **Episode numbering (SxxEyy)**      | No                                 | Yes (config)                                                  | No                                                                                                          | No                                                                                                          |
| **Songs/Albums count**              | Albums only                        | No                                                            | **No**                                                                                                      | **No**                                                                                                      |
| **Bandwidth tracking**              | No                                 | Yes                                                           | No                                                                                                          | No                                                                                                          |
| **Caching**                         | No                                 | No                                                            | No                                                                                                          | No                                                                                                          |
| **Configurable options**            | 3 fields                           | 2 fields                                                      | 2 fields                                                                                                    | 3 fields                                                                                                    |
| **Error specificity**               | Good (401/404)                     | Basic                                                         | Good (401/404)                                                                                              | Good (401/404)                                                                                              |
| **Homepage config options we lack** | -                                  | enableUser, expandOneStreamToTwoRows, showEpisodeNumber       | enableNowPlaying, enableBlocks, enableMediaControl, enableUser, expandOneStreamToTwoRows, showEpisodeNumber | enableNowPlaying, enableBlocks, enableMediaControl, enableUser, expandOneStreamToTwoRows, showEpisodeNumber |
| **Features Homepage lacks**         | Active streams with progress       | Bandwidth stats, stat blocks                                  | -                                                                                                           | -                                                                                                           |

---

## 1. Plex Adapter

### Files Compared

- **Ours:** `/Users/martin/Developer/labitat/src/lib/adapters/plex.tsx`
- **Homepage widget:** `/Users/martin/Developer/labitat/homepage/src/widgets/plex/widget.js`
- **Homepage component:** `/Users/martin/Developer/labitat/homepage/src/widgets/plex/component.jsx`
- **Homepage proxy:** `/Users/martin/Developer/labitat/homepage/src/widgets/plex/proxy.js`

### API Endpoints

| Endpoint                         | Us  | Homepage |
| -------------------------------- | --- | -------- |
| `/status/sessions`               | Yes | Yes      |
| `/library/sections`              | Yes | Yes      |
| `/library/sections/{key}/all`    | Yes | Yes      |
| `/library/sections/{key}/albums` | Yes | Yes      |

**Verdict:** Identical API coverage.

### Data Fields Extracted

| Field                          | Us                             | Homepage             |
| ------------------------------ | ------------------------------ | -------------------- |
| Stream count                   | Yes (XML regex)                | Yes (XML attributes) |
| Albums count                   | Yes                            | Yes                  |
| Movies count                   | Yes                            | Yes                  |
| TV shows count                 | Yes                            | Yes                  |
| Session titles                 | Yes (with XML entity decoding) | No                   |
| Session users                  | Yes                            | No                   |
| Session progress/duration      | Yes                            | No                   |
| Session state (playing/paused) | Yes                            | No                   |

### Stats Displayed

| Stat           | Us  | Homepage           |
| -------------- | --- | ------------------ |
| Active streams | Yes | Yes                |
| Albums         | Yes | Yes                |
| Movies         | Yes | Yes                |
| TV Shows       | Yes | Yes (labeled "TV") |

### What Homepage Does Better

1. **Aggressive caching** -- Homepage caches library data for 6 hours and counts for 10 minutes. Our adapter re-fetches everything on every poll (10s default). This is a significant performance difference for large Plex libraries.

   ```javascript
   // Homepage proxy.js
   cache.put(
     `${librariesCacheKey}.${service}.${index}`,
     libraries,
     1000 * 60 * 60 * 6
   ) // 6 hours
   cache.put(`${albumsCacheKey}.${service}.${index}`, albums, 1000 * 60 * 10) // 10 minutes
   ```

2. **Pagination headers** -- Homepage sends `X-Plex-Container-Start: 0` and `X-Plex-Container-Size: 500` headers, which can improve response times for large libraries.

### What We Do Better

1. **Active stream display** -- Our adapter extracts full session data (title, subtitle, user, progress, duration, state) and passes it to the `ActiveStreamList` component. Homepage's component.jsx only shows stat blocks -- no stream details at all.

2. **XML entity decoding** -- We properly decode `&amp;`, `&lt;`, `&gt;`, `&quot;`, `&#39;` in titles. Homepage relies on `xml2json` library which handles this, but we handle it inline without an extra dependency.

3. **Title resolution logic** -- We have sophisticated logic to resolve movie titles from `originalTitle` when the title matches the library section name or contains parentheses.

### Recommended Improvements

#### [IMPORTANT] Add library count caching

Our adapter hits the Plex API for library counts on every poll. For large libraries, this is expensive. Add in-memory caching with TTL:

```typescript
// Add to plex.tsx
const cache = new Map<string, { data: unknown; expires: number }>()

function getCached<T>(key: string, ttlMs: number): T | null {
  const entry = cache.get(key)
  if (entry && entry.expires > Date.now()) return entry.data as T
  return null
}

function setCached(key: string, data: unknown, ttlMs: number) {
  cache.set(key, { data, expires: Date.now() + ttlMs })
}

// In fetchData:
const cacheKey = `plex:libraries:${baseUrl}`
const cachedLibraries = getCached<{
  libraries: typeof libraries
  albums: number
  movies: number
  tvShows: number
}>(cacheKey, 10 * 60 * 1000) // 10 min
if (cachedLibraries) {
  // Use cached counts, only fetch sessions
}
```

#### [NICE-TO-HAVE] Add X-Plex-Container headers

```typescript
const headers = {
  "X-Plex-Token": config.token,
  "X-Plex-Container-Start": "0",
  "X-Plex-Container-Size": "500",
}
```

---

## 2. Tautulli Adapter

### Files Compared

- **Ours:** `/Users/martin/Developer/labitat/src/lib/adapters/tautulli.tsx`
- **Homepage widget:** `/Users/martin/Developer/labitat/homepage/src/widgets/tautulli/widget.js`
- **Homepage component:** `/Users/martin/Developer/labitat/homepage/src/widgets/tautulli/component.jsx`

### API Endpoints

| Endpoint                                | Us  | Homepage |
| --------------------------------------- | --- | -------- |
| `/api/v2?apikey={key}&cmd=get_activity` | Yes | Yes      |

**Verdict:** Identical. Both use the single `get_activity` command.

### Data Fields Extracted

| Field                                         | Us                          | Homepage                           |
| --------------------------------------------- | --------------------------- | ---------------------------------- |
| Stream count                                  | Yes                         | Yes (sessions.length)              |
| Total bandwidth                               | Yes (aggregated, formatted) | No                                 |
| Transcode stream count                        | Yes                         | No                                 |
| Direct play count                             | Yes                         | No                                 |
| Direct stream count                           | Yes                         | No                                 |
| Session title                                 | Yes                         | Yes                                |
| Session subtitle                              | Yes                         | Yes                                |
| Session user                                  | Yes                         | Yes (optional, via enableUser)     |
| Session progress                              | Yes (ms -> seconds)         | Yes (ms, displayed as time string) |
| Session duration                              | Yes (ms -> seconds)         | Yes (ms)                           |
| Session state                                 | Yes                         | Yes                                |
| Video decision                                | Yes (counted)               | Yes (displayed as icon)            |
| Audio decision                                | No                          | Yes (displayed as icon)            |
| Episode SxxEyy formatting                     | No                          | Yes (via showEpisodeNumber)        |
| full_title / friendly_name                    | No                          | Yes                                |
| media_type / parent_media_index / media_index | No                          | Yes                                |

### Stats Displayed

| Stat          | Us  | Homepage       |
| ------------- | --- | -------------- |
| Streams       | Yes | No stat blocks |
| Bandwidth     | Yes | No             |
| Transcoding   | Yes | No             |
| Direct Play   | Yes | No             |
| Direct Stream | Yes | No             |

### What Homepage Does Better

1. **Episode number formatting** -- Homepage can display episodes as `S01E03` format:

   ```javascript
   // Homepage component.jsx
   if (media_type === "episode" && showEpisodeNumber) {
     const season_str = `S${parent_media_index.toString().padStart(2, "0")}`
     const episode_str = `E${media_index.toString().padStart(2, "0")}`
     stream_title = `${grandparent_title}: ${season_str} - ${episode_str} - ${title}`
   }
   ```

2. **Audio decision display** -- Homepage shows separate icons for video AND audio transcoding states, giving a more nuanced view of stream quality.

3. **User display toggle** -- Homepage has `enableUser` config to optionally append `(username)` to stream titles.

4. **Single-stream two-row layout** -- When only one stream is active, Homepage expands it to two rows (title row + progress row) for better readability.

5. **Rich session data usage** -- Homepage uses `full_title`, `friendly_name`, `media_type`, `parent_media_index`, `media_index` for better title formatting.

### What We Do Better

1. **Stats blocks** -- We show 5 stat blocks (streams, bandwidth, transcoding, direct play, direct stream). Homepage shows NO stats blocks for Tautulli -- only stream entries.

2. **Bandwidth aggregation** -- We sum and format total bandwidth across all streams. Homepage does not compute this.

3. **Stream type breakdown** -- We count transcode vs direct play vs direct stream separately as stats. Homepage only shows icons per-stream.

### Recommended Improvements

#### [IMPORTANT] Add episode number formatting to session titles

Add `showEpisodeNumber` config field and use it in session title generation:

```typescript
// Add to configFields
{
  key: "showEpisodeNumber",
  label: "Show episode numbers",
  type: "boolean",
  helperText: "Display TV episodes as S01E03 format",
},

// In fetchData, when building ActiveStream:
const showEpisodeNumber = config.showEpisodeNumber === "true"

// In the session mapping:
let displayTitle = s.title ?? "Unknown"
if (showEpisodeNumber && s.media_type === "episode" && s.parent_media_index && s.media_index) {
  const season = `S${String(s.parent_media_index).padStart(2, "0")}`
  const episode = `E${String(s.media_index).padStart(2, "0")}`
  displayTitle = `${season}${episode} - ${displayTitle}`
}
```

#### [IMPORTANT] Add audio_decision tracking

```typescript
// In the session mapping, also track audio decisions:
if (s.audio_decision === "transcode") transcodeStreams++
else if (s.audio_decision === "direct play") directPlayStreams++
else if (s.audio_decision === "copy") directStreamStreams++
```

#### [NICE-TO-HAVE] Add transcoding info to ActiveStream

Populate the `transcoding` field on each `ActiveStream` so the UI can show transcoding icons:

```typescript
return {
  title: displayTitle,
  subtitle,
  user: s.user ?? "Unknown",
  progress: progressSec,
  duration: durationSec,
  state: s.state === "paused" ? "paused" : "playing",
  transcoding: {
    isDirect:
      s.video_decision === "direct play" && s.audio_decision === "direct play",
    hardwareDecoding: s.video_decision === "copy",
    hardwareEncoding:
      s.video_decision === "transcode" && s.transcode_hw_decoding,
  },
}
```

---

## 3. Emby Adapter

### Files Compared

- **Ours:** `/Users/martin/Developer/labitat/src/lib/adapters/emby.tsx`
- **Homepage widget:** `/Users/martin/Developer/labitat/homepage/src/widgets/emby/widget.js`
- **Homepage component:** `/Users/martin/Developer/labitat/homepage/src/widgets/emby/component.jsx`

### API Endpoints

| Endpoint                                | Us     | Homepage |
| --------------------------------------- | ------ | -------- |
| `/Sessions?ActiveWithinSeconds=120`     | Yes    | Yes      |
| `/Items/Counts`                         | Yes    | Yes      |
| `/Sessions/{id}/Playing/Pause` (POST)   | **No** | Yes      |
| `/Sessions/{id}/Playing/Unpause` (POST) | **No** | Yes      |

### Data Fields Extracted

| Field                   | Us                  | Homepage                                                            |
| ----------------------- | ------------------- | ------------------------------------------------------------------- |
| Active stream count     | Yes                 | Yes                                                                 |
| Movie count             | Yes                 | Yes                                                                 |
| Show count              | Yes                 | Yes                                                                 |
| Episode count           | Yes                 | Yes                                                                 |
| Song count              | **No**              | Yes                                                                 |
| Session NowPlayingItem  | Counted only        | Full object                                                         |
| Session PlayState       | Filtered (IsPaused) | Full (PositionTicks, IsPaused, IsMuted)                             |
| Session TranscodingInfo | **No**              | Yes (IsVideoDirect, VideoDecoderIsHardware, VideoEncoderIsHardware) |
| Session UserName        | **No**              | Yes                                                                 |
| Session Id              | **No**              | Yes (for media control)                                             |
| RunTimeTicks            | **No**              | Yes                                                                 |
| CurrentProgram          | **No**              | Yes (for Live TV)                                                   |

### Stats Displayed

| Stat           | Us     | Homepage                       |
| -------------- | ------ | ------------------------------ |
| Active Streams | Yes    | No (shows stream list instead) |
| Movies         | Yes    | Yes                            |
| Shows          | Yes    | Yes (labeled "Series")         |
| Episodes       | Yes    | Yes                            |
| Songs          | **No** | Yes                            |

### What Homepage Does Better

1. **Full session display** -- Homepage shows each active stream with title, progress bar, time remaining, and transcoding status. We only show a count.

2. **Media controls (Pause/Unpause)** -- Homepage supports POST requests to pause/unpause streams directly from the widget:

   ```javascript
   // Homepage widget.js
   Unpause: {
     method: "POST",
     endpoint: "Sessions/{sessionId}/Playing/Unpause",
     segments: ["sessionId"],
   },
   Pause: {
     method: "POST",
     endpoint: "Sessions/{sessionId}/Playing/Pause",
     segments: ["sessionId"],
   },
   ```

3. **Transcoding indicators** -- Homepage shows different icons for:
   - Direct play (no transcoding): `MdOutlineSmartDisplay`
   - Software transcoding: `BsCpu`
   - Hardware transcoding: `BsFillCpuFill`

4. **Mute status** -- Homepage shows a mute icon when the stream is muted.

5. **Audio stream support** -- Homepage formats audio streams as `AlbumArtist - Album - Name`.

6. **Live TV support** -- Homepage handles `CurrentProgram` for live TV sessions.

7. **Configurable options** -- Homepage has 6 widget config options:
   - `enableNowPlaying` (default: true) -- toggle stream list display
   - `enableBlocks` -- toggle stat blocks display
   - `enableMediaControl` (default: true) -- toggle pause/unpause buttons
   - `enableUser` (default: false) -- show username in stream title
   - `expandOneStreamToTwoRows` (default: true) -- two-row layout for single stream
   - `showEpisodeNumber` (default: false) -- SxxEyy episode formatting

8. **Song count** -- Homepage displays song count in stat blocks.

### What We Do Better

1. **Error specificity** -- We return specific error messages for 401 (invalid key) and 404 (not found). Homepage's proxy returns generic errors.

### Recommended Improvements

#### [CRITICAL] Add active stream list with session details

This is the biggest gap. Our Emby adapter only counts active streams but doesn't extract session data. Homepage shows rich stream entries with progress bars.

```typescript
// Add to EmbyData type
type EmbyData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  activeStreams: number
  movies: number
  shows: number
  episodes: number
  songs: number
  sessions?: ActiveStream[]
}

// In fetchData, extract session details:
const sessions: ActiveStream[] = sessionsData
  .filter(
    (s: { NowPlayingItem?: unknown; PlayState?: { IsPaused: boolean } }) =>
      s.NowPlayingItem && !s.PlayState?.IsPaused
  )
  .map(
    (s: {
      Id: string
      UserName: string
      NowPlayingItem: {
        Name: string
        SeriesName?: string
        Type: string
        ParentIndexNumber?: number
        IndexNumber?: number
        RunTimeTicks?: number
        AlbumArtist?: string
        Album?: string
        CurrentProgram?: { RunTimeTicks?: number }
      }
      PlayState: {
        PositionTicks: number
        IsPaused: boolean
      }
      TranscodingInfo?: {
        IsVideoDirect: boolean
        VideoDecoderIsHardware: boolean
        VideoEncoderIsHardware: boolean
      }
    }) => {
      const item = s.NowPlayingItem
      const ticksToSeconds = (ticks: number) => ticks / 10000000

      let title = item.Name ?? "Unknown"
      let subtitle: string | undefined

      if (item.Type === "Episode" && item.SeriesName) {
        subtitle = item.SeriesName
        if (item.ParentIndexNumber && item.IndexNumber) {
          const season = `S${String(item.ParentIndexNumber).padStart(2, "0")}`
          const episode = `E${String(item.IndexNumber).padStart(2, "0")}`
          title = `${season}${episode} - ${title}`
        }
      } else if (item.Type === "Audio") {
        subtitle = item.AlbumArtist
        title = `${item.Album} - ${title}`
      }

      const runtimeTicks =
        item.RunTimeTicks ?? item.CurrentProgram?.RunTimeTicks ?? 0
      const progressSec = ticksToSeconds(s.PlayState.PositionTicks)
      const durationSec = ticksToSeconds(runtimeTicks)

      return {
        title,
        subtitle,
        user: s.UserName ?? "Unknown",
        progress: progressSec,
        duration: durationSec,
        state: s.PlayState.IsPaused ? "paused" : "playing",
        streamId: s.Id,
        transcoding: s.TranscodingInfo
          ? {
              isDirect: s.TranscodingInfo.IsVideoDirect,
              hardwareDecoding: s.TranscodingInfo.VideoDecoderIsHardware,
              hardwareEncoding: s.TranscodingInfo.VideoEncoderIsHardware,
            }
          : undefined,
      }
    }
  )

return {
  _status: "ok" as const,
  activeStreams: sessions.length,
  movies: countsData.MovieCount ?? 0,
  shows: countsData.SeriesCount ?? 0,
  episodes: countsData.EpisodeCount ?? 0,
  songs: countsData.SongCount ?? 0,
  sessions,
}
```

#### [IMPORTANT] Add song count

```typescript
// In embyToPayload, add:
{
  id: "songs",
  value: (data.songs ?? 0).toLocaleString(),
  label: "Songs",
  icon: Music,
},
```

#### [IMPORTANT] Add config options for Emby

```typescript
// Add to configFields:
{
  key: "showEpisodeNumber",
  label: "Show episode numbers",
  type: "boolean",
  helperText: "Display TV episodes as S01E03 format",
},
{
  key: "showUser",
  label: "Show username in stream title",
  type: "boolean",
  helperText: "Append username to stream title",
},
```

---

## 4. Jellyfin Adapter

### Files Compared

- **Ours:** `/Users/martin/Developer/labitat/src/lib/adapters/jellyfin.tsx`
- **Homepage widget:** `/Users/martin/Developer/labitat/homepage/src/widgets/jellyfin/widget.js`
- **Homepage component:** `/Users/martin/Developer/labitat/homepage/src/widgets/jellyfin/component.jsx`
- **Homepage proxy:** `/Users/martin/Developer/labitat/homepage/src/widgets/jellyfin/proxy.js`

### API Endpoints

| Endpoint                                | Us     | Homepage                                            |
| --------------------------------------- | ------ | --------------------------------------------------- |
| `/Sessions?ActiveWithinSeconds=120`     | Yes    | Yes (v1: `/emby/Sessions`, v2: `/Sessions`)         |
| `/Items/Counts`                         | Yes    | Yes (v1: `/emby/Items/Counts`, v2: `/Items/Counts`) |
| `/Sessions/{id}/Playing/Pause` (POST)   | **No** | Yes                                                 |
| `/Sessions/{id}/Playing/Unpause` (POST) | **No** | Yes                                                 |

### Data Fields Extracted

| Field                   | Us                  | Homepage                                |
| ----------------------- | ------------------- | --------------------------------------- |
| Active stream count     | Yes                 | Yes                                     |
| Movie count             | Yes                 | Yes                                     |
| Show count              | Yes                 | Yes                                     |
| Episode count           | Yes                 | Yes                                     |
| Song count              | **No**              | Yes                                     |
| Session NowPlayingItem  | Counted only        | Full object                             |
| Session PlayState       | Filtered (IsPaused) | Full (PositionTicks, IsPaused, IsMuted) |
| Session TranscodingInfo | **No**              | Yes                                     |
| Session UserName        | **No**              | Yes                                     |
| Session Id              | **No**              | Yes (for media control)                 |
| RunTimeTicks            | **No**              | Yes                                     |
| CurrentProgram          | **No**              | Yes                                     |

### V1 vs V2 API Handling

**Issue found:** Our adapter has a `version` config field with v1/v2 options, but both versions use the same endpoints (`/Sessions` and `/Items/Counts`). The V1/V2 difference in Jellyfin is about the URL prefix (`/emby/` for v1 compatibility vs native v2), but our adapter doesn't actually differentiate:

```typescript
// Our adapter -- both versions use the same paths!
const sessionsEndpoint = useJellyfinV2 ? "/Sessions" : "/Sessions"
const itemsEndpoint = useJellyfinV2 ? "/Items/Counts" : "/Items/Counts"
```

Homepage correctly handles this:

```javascript
// Homepage widget.js
// V1 uses /emby/ prefix, V2 uses native paths
Sessions: { endpoint: "emby/Sessions?api_key={key}" },
SessionsV2: { endpoint: "Sessions" },
```

### Stats Displayed

| Stat           | Us     | Homepage                       |
| -------------- | ------ | ------------------------------ |
| Active Streams | Yes    | No (shows stream list instead) |
| Movies         | Yes    | Yes                            |
| Shows          | Yes    | Yes (labeled "Series")         |
| Episodes       | Yes    | Yes                            |
| Songs          | **No** | Yes                            |

### What Homepage Does Better

1. **Full session display** -- Same as Emby: rich stream entries with progress bars, transcoding icons, time display.

2. **Media controls (Pause/Unpause)** -- Homepage supports POST requests with session ID.

3. **Proper V1/V2 API differentiation** -- Homepage uses `/emby/` prefix for v1 and native paths for v2. Our adapter's version config is effectively a no-op.

4. **Transcoding indicators** -- Same as Emby: direct play, software transcode, hardware transcode icons.

5. **Mute status display** -- Shows mute icon when stream is muted.

6. **Audio stream support** -- Formats audio as `AlbumArtist - Album - Name`.

7. **Live TV support** -- Handles `CurrentProgram` for live TV.

8. **Configurable options** -- Same 6 options as Emby:
   - `enableNowPlaying`, `enableBlocks`, `enableMediaControl`, `enableUser`, `expandOneStreamToTwoRows`, `showEpisodeNumber`

9. **Song count** -- Displays song count in stat blocks.

### What We Do Better

1. **Error specificity** -- Same as Emby: specific 401/404 error messages.

### Recommended Improvements

#### [CRITICAL] Fix V1/V2 API endpoint handling

Our version config field is non-functional. Fix the endpoint paths:

```typescript
// In fetchData:
const apiPrefix = useJellyfinV2 ? "" : "/emby"

const [sessionsRes, countsRes] = await Promise.all([
  fetch(`${baseUrl}${apiPrefix}/Sessions?ActiveWithinSeconds=120`, { headers }),
  fetch(`${baseUrl}${apiPrefix}/Items/Counts`, { headers }),
])
```

#### [CRITICAL] Add active stream list with session details

Same implementation as Emby (they share the same API structure):

```typescript
// Add to JellyfinData type
type JellyfinData = {
  _status?: "ok" | "warn" | "error"
  _statusText?: string
  activeStreams: number
  movies: number
  shows: number
  episodes: number
  songs: number
  sessions?: ActiveStream[]
}

// Extract session details (same pattern as Emby recommendation above)
const sessions: ActiveStream[] = sessionsData
  .filter(
    (s: { NowPlayingItem?: unknown; PlayState?: { IsPaused: boolean } }) =>
      s.NowPlayingItem && !s.PlayState?.IsPaused
  )
  .map((s) => {
    // ... same mapping as Emby
  })
```

#### [IMPORTANT] Add song count

```typescript
// In jellyfinToPayload, add:
{
  id: "songs",
  value: data.songs,
  label: "Songs",
  icon: Music,
},
```

#### [IMPORTANT] Add config options

```typescript
// Add to configFields:
{
  key: "showEpisodeNumber",
  label: "Show episode numbers",
  type: "boolean",
  helperText: "Display TV episodes as S01E03 format",
},
{
  key: "showUser",
  label: "Show username in stream title",
  type: "boolean",
  helperText: "Append username to stream title",
},
```

---

## Priority-Ranked Improvement List

### Critical (implement first)

| #   | Improvement                                                                | Adapters                 | Effort | Impact                                                |
| --- | -------------------------------------------------------------------------- | ------------------------ | ------ | ----------------------------------------------------- |
| 1   | Add active stream list with session details (title, progress, user, state) | Emby, Jellyfin           | Medium | High -- brings parity with Homepage's primary feature |
| 2   | Fix Jellyfin V1/V2 API endpoint handling                                   | Jellyfin                 | Low    | High -- current version config is broken/no-op        |
| 3   | Add transcoding info to ActiveStream objects                               | Tautulli, Emby, Jellyfin | Low    | High -- enables transcoding icons in UI               |

### Important (implement second)

| #   | Improvement                            | Adapters                 | Effort | Impact                                        |
| --- | -------------------------------------- | ------------------------ | ------ | --------------------------------------------- |
| 4   | Add song count to stats                | Emby, Jellyfin           | Low    | Medium -- Homepage displays it                |
| 5   | Add episode number formatting (SxxEyy) | Tautulli, Emby, Jellyfin | Low    | Medium -- better TV episode display           |
| 6   | Add library count caching              | Plex                     | Medium | Medium -- reduces API load on large libraries |
| 7   | Add audio_decision tracking            | Tautulli                 | Low    | Medium -- more accurate stream type counts    |
| 8   | Add showUser config option             | Emby, Jellyfin           | Low    | Medium -- optional username display           |

### Nice-to-Have (implement later)

| #   | Improvement                                | Adapters       | Effort | Impact                                                        |
| --- | ------------------------------------------ | -------------- | ------ | ------------------------------------------------------------- |
| 9   | Add X-Plex-Container headers               | Plex           | Low    | Low -- minor performance improvement                          |
| 10  | Add Live TV CurrentProgram support         | Emby, Jellyfin | Low    | Low -- edge case for live TV users                            |
| 11  | Add media control (pause/unpause) support  | Emby, Jellyfin | High   | Medium -- requires POST endpoint support in adapter framework |
| 12  | Add mute status display                    | Emby, Jellyfin | Low    | Low -- cosmetic detail                                        |
| 13  | Add expandOneStreamToTwoRows layout option | All            | Low    | Low -- UI layout preference                                   |

---

## Our Advantages Over Homepage (Keep These)

1. **Tautulli: Stats blocks** -- Homepage shows only stream entries for Tautulli. We show 5 stat blocks including bandwidth, transcoding counts, etc. This is strictly more informative.

2. **Plex: Active streams** -- Homepage's Plex widget only shows stat blocks. We show active streams with progress bars, user info, and state.

3. **Unified ActiveStream type** -- Our adapters all use a shared `ActiveStream` type with `transcoding` and `streamId` fields, enabling consistent UI across all media adapters.

4. **TypeScript** -- Our adapters are fully typed. Homepage uses JavaScript with no type safety.

5. **Adapter pattern** -- Our `ServiceDefinition` pattern with `fetchData` + `toPayload` separation is cleaner than Homepage's proxy + component split, making it easier to test and maintain.

6. **Error handling** -- Our adapters return specific HTTP status error messages (401, 404). Homepage's proxy layer returns generic errors.

---

## Architecture Notes

### Homepage's Architecture

Homepage uses a server-side proxy pattern:

- `widget.js` defines API URL templates and endpoint mappings
- `proxy.js` (where present) handles server-side API calls with caching
- `component.jsx` is a React component that calls the proxy via `useWidgetAPI`

This means Homepage's proxy runs on the server, handles caching, and returns JSON to the client component.

### Our Architecture

We use a client-side adapter pattern:

- `fetchData()` runs in the adapter (server or client depending on deployment)
- `toPayload()` transforms raw data into `WidgetPayload`
- `WidgetContainer` renders the payload using shared components

Our approach is more modular and testable, but lacks the caching layer that Homepage's proxy provides.

### Key Insight

The biggest gaps are in **Emby** and **Jellyfin** where we only show counts but Homepage shows full stream details. **Plex** and **Tautulli** are closer to parity -- we actually exceed Homepage in some areas (active streams for Plex, stats for Tautulli).
