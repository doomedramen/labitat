# Bambuddy

Displays configured printers, online printers, printing printers, and paused printers. Refreshes every 30 seconds using the printer list and each printer's live status. Counts reflect printers visible to the configured credentials. Offline printers with stale print states do not count as printing or paused.

Enter your instance URL (including any URL base) and an API key with read-status permission. Leave the key blank if authentication is disabled. Labitat must be able to reach Bambuddy from its server.

Only read requests are used. Printer access codes, names, and current print details are not returned in widget data. If any status request fails, the widget reports an error instead of presenting incomplete totals.

[API research and upstream sources](../../research/bambuddy-api.md).
