import type { ServiceDefinition } from "./types";
import { Download, Clock, BookPlus, AlertTriangle, Package, Inbox } from "lucide-react";
import { fetchWithTimeout } from "./fetch-with-timeout";
import { validateResponse } from "./validate";

const fields = [
  ["active", "Active", "queue.active", Download],
  ["queued", "Queued", "queue.queued", Clock],
  ["awaiting-pickup", "Awaiting pickup", "queue.awaiting_pickup", Package],
  ["added-7d", "Added (7 days)", "added.total_7d", BookPlus],
  ["pending", "Pending requests", "requests.pending", Inbox],
  ["failed-7d", "Failed (7 days)", "errors.failed_7d", AlertTriangle],
] as const;
type ShelfmarkData = { _status: "ok"; counts: Record<string, number> };

export const shelfmarkDefinition: ServiceDefinition<ShelfmarkData> = {
  id: "shelfmark",
  name: "Shelfmark (Calibre Downloader)",
  icon: "shelfmark",
  category: "downloads",
  defaultPollingMs: 30_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://shelfmark.example.org",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      helperText:
        "Use SHELFMARK_API_KEY_READONLY from your server configuration. Leave blank if authentication is disabled.",
    },
  ],
  async fetchData(config) {
    if (!config.url) throw new Error("Shelfmark URL is required");
    const response = await fetchWithTimeout(`${config.url.replace(/\/+$/, "")}/api/stats`, {
      headers: config.apiKey ? { "X-Api-Key": config.apiKey } : {},
    });
    if (!response.ok) throw new Error(`Shelfmark stats error: ${response.status}`);
    const raw = validateResponse<Record<string, Record<string, number>>>(
      await response.json(),
      ["queue", "added", "requests", "errors"],
      fields.map(([, , path]) => ({ path, type: "number" })),
      { adapter: "shelfmark" },
    );
    const counts: Record<string, number> = {};
    for (const [id, , path] of fields) {
      const [group, key] = path.split(".");
      const count = raw[group][key];
      if (!Number.isSafeInteger(count) || count < 0)
        throw new Error(`Shelfmark invalid count: ${path}`);
      counts[id] = count;
    }
    return { _status: "ok", counts };
  },
  toPayload(data) {
    return {
      stats: fields.map(([id, label, , icon]) => ({ id, label, icon, value: data.counts[id] })),
    };
  },
};
