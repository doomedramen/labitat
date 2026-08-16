# NUT UPS

UPS (Uninterruptible Power Supply) monitoring via Network UPS Tools (`upsd`).

## Configuration

| Field    | Type     | Required | Description                                                               |
| -------- | -------- | -------- | ------------------------------------------------------------------------- |
| Host     | Text     | Yes      | IP address or hostname of your NUT (upsd) server                          |
| Port     | Number   | No       | NUT upsd network port (default: 3493)                                     |
| UPS Name | Text     | Yes      | Name of the UPS as configured on the NUT server (`ups.conf` section name) |
| Username | Text     | No       | Only required if your NUT server has upsd users configured                |
| Password | Password | No       | Only required if your NUT server has upsd users configured                |

## Widget Displays

- Status
- Load percentage
- Battery charge
- Runtime
