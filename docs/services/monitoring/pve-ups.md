# PVE UPS

UPS power monitoring via a [PVE-UPS](https://github.com/ffind-dev/pve-ups) appliance — a
container that watches your UPS over SNMP and powers off Proxmox VE nodes (and PBS hosts)
on a confirmed outage.

Both endpoints this adapter reads (`/api/status` and `/api/health`) are public and
read-only in PVE-UPS, so there is nothing to authenticate against.

## Configuration

| Field | Type | Required | Description                                                                         |
| ----- | ---- | -------- | ----------------------------------------------------------------------------------- |
| URL   | URL  | Yes      | Base URL of the PVE-UPS container (default port `8080`)                             |
| UPS   | Text | No       | Pin a single UPS by `id` or `name`. Leave blank to roll up every configured device. |

The sidebar label is generated from the filename.

## Widget Displays

- Power — Mains / On battery / Bypass / No output / Unknown
- Load percentage
- Battery charge (tooltip carries the battery status)
- Estimated runtime
- Mode — Armed or Dry run
- Targets — shutdown targets that passed their last self-test
- Events — warnings and errors from the appliance's 48 hour log

The first four are shown by default; enable the rest in edit mode.

## Multiple UPS devices

Leave the UPS field blank and the adapter rolls every configured device into one tile,
worst-case-wins throughout: load is averaged, charge and runtime take the lowest value,
and any unreachable device or active battery takes over the status. The Power tooltip
lists each device with its own state.

Pin a device by `id` or `name` when you would rather have one tile per UPS.

## Status mapping

The tile goes amber or red using the same fail-safe rule the appliance itself applies to
its shutdown decision — losing contact with a UPS is never treated as a confirmed outage:

| Tile state | Meaning                                                                  |
| ---------- | ------------------------------------------------------------------------ |
| Red        | An appliance alarm is active, or a UPS is unreachable                    |
| Amber      | Running on battery, a low battery, or a target failed its last self-test |
| Green      | On mains with every shutdown target verified                             |

An unreachable `/api/health` never reports a failure — the self-test counters are
recomputed from `/api/status` instead, so a dead engine task does not make every target
look broken.

## Notes

- Runtime shows `—` while on mains. RFC 1628 leaves the runtime estimate undefined there,
  and PVE-UPS deliberately refuses to present a stale transfer's counter as a multi-day
  runtime.
- Dry run is the safe default: the tile reads **Armed** only when the appliance reports
  `dry_run: false`.
- pve-ups polls on mains every 30s and on battery every 8s; the adapter matches that with
  a 15s default polling interval.
