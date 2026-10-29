import type { ServiceDefinition } from "./types";
import { Printer, Wifi, Play, Pause } from "lucide-react";
import { fetchWithTimeout } from "./fetch-with-timeout";
import { validateResponse } from "./validate";

type BambuddyData = {
  _status: "ok";
  printers: number;
  online: number;
  printing: number;
  paused: number;
};
export const bambuddyDefinition: ServiceDefinition<BambuddyData> = {
  id: "bambuddy",
  name: "Bambuddy",
  icon: "bambuddy",
  category: "monitoring",
  defaultPollingMs: 30_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://bambuddy.example.org",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      helperText:
        "Use a key with read-status permission. Leave blank if Bambuddy authentication is disabled.",
    },
  ],
  async fetchData(config) {
    if (!config.url) throw new Error("Bambuddy URL is required");
    const base = `${config.url.replace(/\/+$/, "")}/api/v1/printers`;
    async function get(path: string): Promise<unknown> {
      const response = await fetchWithTimeout(`${base}${path}`, {
        headers: config.apiKey ? { "X-API-Key": config.apiKey } : {},
      });
      if (!response.ok) throw new Error(`Bambuddy error: ${response.status}`);
      return response.json();
    }
    const printers = await get("/");
    if (!Array.isArray(printers)) throw new Error("Bambuddy invalid printer list");
    const ids = printers.map((printer) => {
      const record = validateResponse<{ id: number }>(
        printer,
        ["id"],
        [{ path: "id", type: "number" }],
        { adapter: "bambuddy" },
      );
      if (!Number.isSafeInteger(record.id) || record.id < 1)
        throw new Error("Bambuddy invalid printer ID");
      return record.id;
    });
    if (new Set(ids).size !== ids.length) throw new Error("Bambuddy duplicate printer IDs");
    const statuses: { connected: boolean; state?: string | null }[] = [];
    // Bound concurrent requests for larger print farms.
    for (let offset = 0; offset < ids.length; offset += 5) {
      statuses.push(
        ...(await Promise.all(
          ids.slice(offset, offset + 5).map(async (id) => {
            const status = validateResponse<{
              id: number;
              connected: boolean;
              state?: string | null;
            }>(
              await get(`/${id}/status`),
              ["id", "connected"],
              [{ path: "connected", type: "boolean" }],
              { adapter: "bambuddy" },
            );
            if (status.id !== id || (status.state != null && typeof status.state !== "string"))
              throw new Error("Bambuddy invalid printer status");
            return { connected: status.connected, state: status.state };
          }),
        )),
      );
    }
    return {
      _status: "ok",
      printers: ids.length,
      online: statuses.filter((s) => s.connected).length,
      printing: statuses.filter((s) => s.connected && s.state === "RUNNING").length,
      paused: statuses.filter((s) => s.connected && s.state === "PAUSE").length,
    };
  },
  toPayload(data) {
    return {
      stats: [
        { id: "printers", label: "Printers", value: data.printers, icon: Printer },
        { id: "online", label: "Online", value: data.online, icon: Wifi },
        { id: "printing", label: "Printing", value: data.printing, icon: Play },
        { id: "paused", label: "Paused", value: data.paused, icon: Pause },
      ],
    };
  },
};
