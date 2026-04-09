# Sonarr & Radarr Adapter Improvements

## Summary

Updated both Sonarr and Radarr adapters to match Homepage's implementation with better download state formatting, improved title formatting, and added `enableQueue` configuration option.

---

## Changes Made

### 1. Download State Formatting (Matches Homepage)

**Before:**

- Generic state detection using `includes()` checks
- Missing special states like "import pending" and "failed pending"

**After:**

- Exact state matching like Homepage's `formatDownloadState` function
- Proper handling of:
  - `importPending` → "Import pending"
  - `failedPending` → "Failed pending"
  - `importing` → "Importing"
  - `downloading` → "Downloading"
  - `failed` → "Failed"
  - `paused` → "Paused"
  - `queued` → "Queued"

**Code:**

```typescript
// Matches Homepage's formatDownloadState function
const state = record.trackedDownloadState?.toLowerCase() ?? ""
let activity: string | undefined
if (state === "importpending") {
  activity = "Import pending"
} else if (state === "failedpending") {
  activity = "Failed pending"
} else if (state.includes("import")) {
  activity = "Importing"
} // ... etc
```

---

### 2. Title Formatting (Matches Homepage)

#### Sonarr

**Before:**

```typescript
const displayTitle = seriesName
  ? `${seriesName} - ${episodeTitle}`
  : episodeTitle
```

**After:**

```typescript
// Matches Homepage's getTitle function
const episodeTitle = record.episode?.title ?? record.title
const displayTitle = seriesName
  ? `${seriesName}: ${episodeTitle}`
  : episodeTitle
```

**Example Output:**

- Before: `Test Series - S01E01 Test Episode`
- After: `Test Series: S01E01 Test Episode` (matches Homepage format)

#### Radarr

**Before:**

```typescript
downloads.push({
  title: record.title ?? "Unknown",
  // ...
})
```

**After:**

```typescript
// Build title with movie name if available
const movieName = record.movie?.title ?? record.title
downloads.push({
  title: movieName ?? "Unknown",
  // ...
})
```

**Benefit:** Now uses the movie object from the queue record if available, providing more accurate titles.

---

### 3. Enable Queue Configuration Option

**Added:**

- New `enableQueue` config field (boolean, defaults to `true`)
- Matches Homepage's `enableQueue` widget option
- Allows users to disable the download queue display

**Config Field:**

```typescript
{
  key: "enableQueue",
  label: "Show download queue",
  type: "boolean",
  required: false,
  helperText: "Enable or disable the download queue display",
}
```

**Usage:**

```typescript
const enableQueue = config.enableQueue !== "false" // Default to true

// Only fetch/process downloads if both flags are true
if (enableQueue && showActiveDownloads && queue.records) {
  // Process downloads...
}
```

**Payload Logic:**

```typescript
downloads:
  data.enableQueue && data.showActiveDownloads && data.downloads?.length
    ? data.downloads
    : undefined,
```

**Benefit:** Users can now hide the download queue while keeping the stat blocks (queued, missing, wanted, series/movies).

---

## Comparison with Homepage

| Feature                        | Homepage                 | Labitat (Before)   | Labitat (After)                    |
| ------------------------------ | ------------------------ | ------------------ | ---------------------------------- |
| Download state formatting      | ✅ `formatDownloadState` | ❌ Generic         | ✅ Matches Homepage                |
| "Import pending" state         | ✅                       | ❌                 | ✅                                 |
| "Failed pending" state         | ✅                       | ❌                 | ✅                                 |
| Sonarr title format            | `Series: Episode`        | `Series - Episode` | `Series: Episode` ✅               |
| Radarr title from movie object | ✅                       | ❌                 | ✅                                 |
| `enableQueue` option           | ✅                       | ❌                 | ✅                                 |
| Queue sorting                  | ✅ By state/progress     | ❌ None            | ✅ Auto-sorted (from DownloadList) |

---

## Testing

All tests updated and passing:

- ✅ Config field count updated (3 → 4)
- ✅ Title format tests updated
- ✅ Added tests for `enableQueue` option
- ✅ Added test for queue disabled scenario

**Test Results:**

```
✓ src/lib/adapters/sonarr.test.tsx (12 tests)
✓ src/lib/adapters/radarr.test.tsx (12 tests)
```

---

## Files Modified

1. **`src/lib/adapters/sonarr.tsx`**
   - Added `enableQueue` to type definition
   - Added `enableQueue` config field
   - Updated download state formatting
   - Updated title formatting to use episode title
   - Updated `toPayload` to respect `enableQueue`

2. **`src/lib/adapters/radarr.tsx`**
   - Added `enableQueue` to type definition
   - Added `enableQueue` config field
   - Updated download state formatting
   - Updated to use movie title from queue record
   - Updated `toPayload` to respect `enableQueue`

3. **`src/lib/adapters/sonarr.test.tsx`**
   - Updated config field count assertion
   - Updated title format assertion
   - Added `enableQueue` to test cases
   - Added test for queue disabled scenario

4. **`src/lib/adapters/radarr.test.tsx`**
   - Updated config field count assertion
   - Added `enableQueue` to test cases
   - Added test for queue disabled scenario

---

## Migration Guide

### For Existing Users

No action required! The changes are backwards compatible:

- `enableQueue` defaults to `true` (queue shown by default)
- Existing configurations will continue to work
- Download titles will automatically use the new format

### To Disable Download Queue

1. Edit your Sonarr/Radarr widget
2. Uncheck "Show download queue"
3. Save - only stat blocks will be shown

---

## Benefits

1. **Consistency with Homepage** - Users migrating from Homepage will see familiar behavior
2. **Better Download States** - More accurate status messages for downloads
3. **Improved Titles** - Cleaner, more consistent title formatting
4. **Flexibility** - Users can now hide queues while keeping stats
5. **Auto-Sorting** - Downloads automatically sorted (active first, then by progress)

---

## Example Output

### Sonarr Download Queue

```
Test Series: S01E01 Test Episode        1.0 GB - Downloading - 15m
Another Series: S02E03 Episode Name     2.0 GB - Import pending
Third Series: S01E05 Final Episode      1.5 GB - Failed pending
```

### Radarr Download Queue

```
Test Movie (2024)                       4.5 GB - Downloading - 30m
Another Movie (2023)                    2.1 GB - Import pending
```

### Stat Blocks (with enableQueue=false)

```
┌─────────────────────────────────────┐
│ Queued: 5  Missing: 12  Wanted: 8  │
│ Series: 25                          │
└─────────────────────────────────────┘
```

(Download queue hidden, stats still visible)
