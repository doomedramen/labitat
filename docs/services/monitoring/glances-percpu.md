# Glances Per-Core CPU

Individual CPU core utilization monitoring from Glances.

## Configuration

| Field    | Type     | Required | Description      |
| -------- | -------- | -------- | ---------------- |
| URL      | URL      | Yes      | Glances API URL  |
| Username | Text     | No       | Glances username |
| Password | Password | No       | Glances password |

## Widget Displays

- Per-core CPU utilization bars
- Color-coded by usage:
  - Green: < 70%
  - Amber: 70-90%
  - Red: > 90%

## Notes

Shows utilization for each CPU core individually, labeled as C0, C1, C2, etc. Useful for identifying uneven CPU load distribution across cores.
