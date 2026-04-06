# Proxmox Backup Server

Proxmox Backup Server - enterprise backup solution for virtual machines and containers.

## Configuration

| Field     | Type     | Required | Description                                                        |
| --------- | -------- | -------- | ------------------------------------------------------------------ |
| URL       | URL      | Yes      | PBS API URL (e.g., `https://pbs.local:8007`)                       |
| Username  | Text     | Yes      | PBS username (e.g., `root@pam`)                                    |
| Password  | Password | Yes      | PBS password                                                       |
| Datastore | Text     | No       | Specific datastore name to monitor. Leave blank to show aggregate. |

## Widget Displays

- Datastore usage percentage
- Failed tasks in last 24 hours
- CPU usage percentage
- Memory usage percentage

## Notes

This widget monitors your Proxmox Backup Server instance, showing datastore usage, recent backup failures, and system resource usage. If you have multiple datastores, you can specify one to monitor or leave it blank to see aggregate usage across all datastores.
