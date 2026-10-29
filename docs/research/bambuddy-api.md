# Bambuddy widget API

Verified 2026-10-29 against upstream `maziggy/bambuddy` main. Instance release compatibility remains to be tested.

## Read-only requests

The default API prefix is `/api/v1` ([configuration](https://github.com/maziggy/bambuddy/blob/main/backend/app/core/config.py)); main mounts the printers router under it ([mount](https://github.com/maziggy/bambuddy/blob/main/backend/app/main.py)).

1. `GET /api/v1/printers/` returns a **bare array**, not an envelope. Each item has `id` (integer), `name` (string), `is_active` (boolean), plus configuration fields. An empty array is valid. [Route source](https://github.com/maziggy/bambuddy/blob/main/backend/app/api/routes/printers.py), [PrinterResponse schema](https://github.com/maziggy/bambuddy/blob/main/backend/app/schemas/printer.py).
2. For each printer, `GET /api/v1/printers/{id}/status` returns a **bare object**: `{id, name, connected, state, progress, remaining_time, ...}`. `connected` is boolean; `state` is nullable string; `progress` is nullable float; `remaining_time` is nullable integer (minutes). No MQTT state returns `connected:false` and nullable default status fields, rather than an HTTP failure. Unknown printer IDs return 404. [Status handler](https://github.com/maziggy/bambuddy/blob/main/backend/app/api/routes/printers.py), [PrinterStatus schema](https://github.com/maziggy/bambuddy/blob/main/backend/app/schemas/printer.py). Minutes are confirmed by the webhook converting `remaining_time * 60` into `remaining_seconds` ([webhook source](https://github.com/maziggy/bambuddy/blob/main/backend/app/api/routes/webhook.py)).

There is no aggregate `/printers/status` route in the reviewed printers router. That path would collide with the dynamic printer-ID route. Aggregate client-side/server-adapter counts after fetching individual statuses.

## Authentication

- `X-API-Key: <key>` is supported; `Authorization: Bearer bb_...` is also supported.
- Credentials are optional when Bambuddy authentication is disabled.
- With authentication enabled, both list and status routes require `PRINTERS_READ`, mapped to API key scope `can_read_status`.
- No queue/control permissions are needed. Never return raw list results from a dashboard adapter: auth-disabled or trusted-user responses may contain printer access codes. Reduce the response to count/status values.
- [Authentication and scope mapping](https://github.com/maziggy/bambuddy/blob/main/backend/app/core/auth.py), [route serialization](https://github.com/maziggy/bambuddy/blob/main/backend/app/api/routes/printers.py).

## Suggested aggregate widget

- Printers: length of configured printer array.
- Online: statuses with `connected === true`.
- Printing: connected statuses with `state === "RUNNING"`.
- Paused: connected statuses with `state === "PAUSE"`.

The RUNNING/PAUSE active-print states are explicitly used by [printer manager](https://github.com/maziggy/bambuddy/blob/main/backend/app/services/printer_manager.py) and the status handler. Gate activity counts on `connected` to avoid stale disconnected state counting as active printing. `is_active` is configuration, not online status. Do not silently count failed status requests as offline; surface fetch errors or clearly identify partial results.

## Alternative rejected for live printer counts

`GET /api/v1/webhook/queue` returns per-printer pending/printing **queued job** counts. It filters printer restrictions for API keys but does not provide connected state and cannot represent all externally started prints. It is unsuitable as a substitute for live printer status. [Webhook source](https://github.com/maziggy/bambuddy/blob/main/backend/app/api/routes/webhook.py).

## Test cases

Empty array; mixed connected RUNNING/PAUSE/IDLE/disconnected states; disconnected stale RUNNING state; nullable state; auth header presence/absence; URL base and trailing slash; malformed array/status and ID types; 401/403 and per-printer HTTP failures; no raw secrets in returned data.
