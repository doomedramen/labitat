# Unmanic Adapter Comparison

## Key Differences Found

### 1. **API Version**

- **Homepage**: Uses API v2 (`/unmanic/api/v2/`)
- **Labitat**: Uses API v1 (`/unmanic/api/v1/status`)
- **Impact**: API v2 provides more detailed worker information

### 2. **Endpoints Used**

**Homepage:**

- `workers/status` - Gets detailed worker status (active vs total workers)
- `pending/tasks` - Gets pending task queue (POST request)

**Labitat:**

- `status` (POST) - Gets general status from v1 API
- Single endpoint approach

### 3. **Stats Displayed**

**Homepage (3 stats):**

- `active_workers` - Currently processing
- `total_workers` - Total available workers
- `records_total` - Total pending tasks in queue

**Labitat (4 stats):**

- `activeWorkers` - Currently processing
- `queuedItems` - Items in queue
- `completedToday` - Completed today
- `totalCompleted` - Total completed ever

### 4. **Data Accuracy**

**Homepage:**

- ✅ Calculates `active_workers` by filtering workers where `!worker.idle`
- ✅ Gets `total_workers` from actual worker count
- ✅ Gets `recordsTotal` from dedicated pending tasks endpoint

**Labitat:**

- ⚠️ Uses `status.active_workers` from v1 API (may be less accurate)
- ⚠️ Uses `status.queue_length` (may differ from actual pending tasks)
- ✅ Has completion stats (Homepage doesn't have these)

### 5. **Missing Features in Labitat**

- ❌ No `total_workers` stat (important for understanding capacity)
- ❌ Doesn't use v2 API (more reliable data)
- ❌ No separate pending tasks fetch

### 6. **Missing Features in Homepage**

- ❌ No `completedToday` stat
- ❌ No `totalCompleted` stat
- ❌ No completion tracking

---

## Recommended Improvements for Labitat

### Option 1: Update to API v2 (Recommended)

**Pros:**

- More accurate worker status
- Matches Homepage's implementation
- Better data reliability

**Cons:**

- Requires API v2 support (Unmanic 0.6.0+)
- Breaking change for older versions

### Option 2: Add total_workers stat

**Pros:**

- Backwards compatible with v1
- Adds missing context
- Minimal changes

**Cons:**

- Still using older API

### Option 3: Hybrid approach (Best)

- Try v2 API first, fall back to v1
- Add `total_workers` stat
- Keep completion stats (our advantage over Homepage)
- Fetch pending tasks separately for accuracy

---

## Implementation Plan

### Changes to Make:

1. ✅ Update to use v2 API endpoints
2. ✅ Add `totalWorkers` stat
3. ✅ Fetch pending tasks from dedicated endpoint
4. ✅ Keep completion stats (our unique feature)
5. ✅ Add fallback to v1 if v2 fails
6. ✅ Update tests

---

## Feature Comparison Table

| Feature               | Homepage              | Labitat (Before) | Labitat (After)       |
| --------------------- | --------------------- | ---------------- | --------------------- |
| API Version           | v2                    | v1               | v2 (with v1 fallback) |
| Active Workers        | ✅ Calculated         | ✅ From status   | ✅ Calculated         |
| Total Workers         | ✅                    | ❌               | ✅                    |
| Pending Tasks         | ✅ Dedicated endpoint | ⚠️ From status   | ✅ Dedicated endpoint |
| Completed Today       | ❌                    | ✅               | ✅                    |
| Total Completed       | ❌                    | ✅               | ✅                    |
| Error Handling        | ✅ Basic              | ✅ Basic         | ✅ Basic              |
| Version Compatibility | v2 only               | v1 only          | v1 + v2               |

---

## Stats Comparison

### Homepage Widget

```
┌─────────────────────────────┐
│ Active Workers: 2           │
│ Total Workers: 4            │
│ Pending Tasks: 15           │
└─────────────────────────────┘
```

### Labitat Widget (Before)

```
┌─────────────────────────────┐
│ Active: 2    Queued: 15     │
│ Today: 8     Total: 1,234   │
└─────────────────────────────┘
```

### Labitat Widget (After - Recommended)

```
┌─────────────────────────────┐
│ Active: 2    Total: 4       │
│ Queued: 15   Today: 8       │
│ Total: 1,234                │
└─────────────────────────────┘
```

---

## API Endpoints Reference

### Unmanic API v1 (Old)

```
POST /unmanic/api/v1/status
Response:
{
  "status": {
    "active_workers": 2,
    "queue_length": 15,
    "completed_today": 8,
    "total_completed": 1234
  }
}
```

### Unmanic API v2 (New)

```
GET /unmanic/api/v2/workers/status
Response:
{
  "workers_status": [
    { "idle": false, ... },
    { "idle": true, ... },
    { "idle": false, ... },
    { "idle": true, ... }
  ]
}

POST /unmanic/api/v2/pending/tasks
Response:
{
  "recordsTotal": 15,
  "recordsFiltered": 15,
  "data": [...]
}
```

---

## Recommendation

**Implement Option 3 (Hybrid):**

1. Update to v2 API as primary
2. Add fallback to v1 for backwards compatibility
3. Add `totalWorkers` stat
4. Keep completion stats (our unique advantage)
5. Fetch pending tasks from dedicated endpoint

This gives us:

- ✅ Homepage's accuracy with v2 API
- ✅ Homepage's total_workers context
- ✅ Our completion stats (Homepage doesn't have these)
- ✅ Backwards compatibility with older Unmanic versions
- ✅ Best of both worlds!
