# Glances Disk Usage

Disk space usage visualization from Glances.

## Configuration

| Field        | Type     | Required | Description                                                                               |
| ------------ | -------- | -------- | ----------------------------------------------------------------------------------------- |
| URL          | URL      | Yes      | Glances API URL                                                                           |
| Username     | Text     | No       | Glances username                                                                          |
| Password     | Password | No       | Glances password                                                                          |
| Mount points | Text     | No       | Comma-separated list of mount points to show (e.g., `/, /data`). Leave blank to show all. |

## Widget Displays

- Disk usage donut charts for each mount point
- Used space and total capacity
- Percentage usage visualization

## Notes

This widget shows disk usage for all mounted filesystems or specific mount points you configure. Each disk is displayed as a donut chart with its usage percentage.
