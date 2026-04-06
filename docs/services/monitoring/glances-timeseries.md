# Glances Time Series

Real-time metrics with sparkline visualization from Glances.

## Configuration

| Field    | Type     | Required | Description                                                      |
| -------- | -------- | -------- | ---------------------------------------------------------------- |
| URL      | URL      | Yes      | Glances API URL                                                  |
| Username | Text     | No       | Glances username                                                 |
| Password | Password | No       | Glances password                                                 |
| Metric   | Select   | Yes      | Choose metric: CPU Usage, Memory Usage, Network I/O, or Disk I/O |

## Widget Displays

- Sparkline chart showing metric history
- Current value display
- Trend visualization

### Available Metrics

- **CPU Usage**: Total CPU utilization percentage
- **Memory Usage**: RAM usage percentage
- **Network I/O**: Network receive and transmit rates
- **Disk I/O**: Disk read and write throughput

## Notes

Provides a rolling time-series view to system metrics with sparkline charts. Useful for spotting trends and patterns in resource usage over time.
