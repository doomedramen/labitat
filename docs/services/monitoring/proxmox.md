# Proxmox VE

Proxmox Virtual Environment - hypervisor-based virtualization platform.

## Configuration

| Field    | Type     | Required | Description                                                  |
| -------- | -------- | -------- | ------------------------------------------------------------ |
| URL      | URL      | Yes      | Proxmox VE API URL (e.g., `https://proxmox.local:8006`)      |
| Username | Text     | Yes      | Proxmox username (e.g., `root@pam`)                          |
| Password | Password | Yes      | Proxmox password                                             |
| Node     | Text     | No       | Specific node name to filter. Leave blank to show all nodes. |

## Widget Displays

- Running VMs count (running / total)
- Running LXC containers count (running / total)
- CPU usage percentage
- Memory usage percentage

## Notes

This widget connects to the Proxmox VE API to monitor your virtual machines and containers. It shows the number of running VMs and LXC containers, along with aggregate CPU and memory usage across all nodes (or a specific node if configured).
