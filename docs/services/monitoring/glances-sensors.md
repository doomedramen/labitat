# Glances Temperature Sensors

Hardware temperature monitoring from Glances.

## Configuration

| Field        | Type     | Required | Description                                                                               |
| ------------ | -------- | -------- | ----------------------------------------------------------------------------------------- |
| URL          | URL      | Yes      | Glances API URL                                                                           |
| Username     | Text     | No       | Glances username                                                                          |
| Password     | Password | No       | Glances password                                                                          |
| Label filter | Text     | No       | Filter sensors by label prefix (e.g., `Core` for CPU cores). Leave blank for all sensors. |

## Widget Displays

- Temperature readings for each sensor
- Current temperature in Celsius
- Maximum/critical temperature threshold
- Visual temperature gauge

## Notes

Shows temperature readings from hardware sensors (CPU cores, GPU, motherboard, etc.). Only displays temperature core sensors in Celsius. You can filter to show only specific sensors by their label prefix.
