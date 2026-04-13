import type { ServiceDefinition } from "./types";
import type { DownloadItem } from "@/components/widgets";
import { validateResponse, parseBool } from "./validate";
import { ArrowDown, Clock, List } from "lucide-react";

type SABnzbdData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  speed: string;
  remaining: string;
  queueSize: number;
  downloading: boolean;
  showDownloads?: boolean;
  downloads?: DownloadItem[];
};
import { fetchWithTimeout } from "./fetch-with-timeout";

function sabnzbdToPayload(data: SABnzbdData) {
  return {
    stats: [
      {
        id: "speed",
        value: data.downloading ? data.speed : "Idle",
        label: "Speed",
        icon: ArrowDown,
      },
      {
        id: "left",
        value: data.downloading ? data.remaining : "—",
        label: "Left",
        icon: Clock,
      },
      {
        id: "queue",
        value: data.queueSize,
        label: "Queue",
        icon: List,
      },
    ],
    downloads: data.showDownloads && data.downloads?.length ? data.downloads : undefined,
  };
}

export const sabnzbdDefinition: ServiceDefinition<SABnzbdData> = {
  id: "sabnzbd",
  name: "SABnzbd",
  icon: "sabnzbd",
  category: "downloads",
  defaultPollingMs: 10_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://sabnzbd.example.org",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your SABnzbd API key",
    },
    {
      key: "showDownloads",
      label: "Show active downloads",
      type: "boolean",
      helperText: "Display currently downloading items",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "");
    const showDownloads = parseBool(config.showDownloads, true);
    const url = `${baseUrl}/api?output=json&apikey=${config.apiKey}&mode=queue`;

    const res = await fetchWithTimeout(url);
    if (!res.ok) throw new Error(`SABnzbd error: ${res.status}`);

    type SABQueue = {
      speed?: string;
      timeleft?: string;
      noofslots?: number;
      status?: string;
      slots?: Array<{
        filename: string;
        percentage: string;
        timeleft: string;
        mb: string;
        mbleft: string;
      }>;
    };
    const data = validateResponse<{ queue?: SABQueue }>(
      await res.json(),
      ["queue"],
      [{ path: "queue", type: "object" }],
      { adapter: "sabnzbd" },
    );
    const queue = data.queue ?? {};
    const slots = queue.slots ?? [];

    const downloads: DownloadItem[] = slots.slice(0, 3).map((slot) => ({
      title: slot.filename,
      progress: parseFloat(slot.percentage ?? "0"),
      timeLeft: slot.timeleft,
      activity: "downloading",
      size: slot.mb ? `${parseFloat(slot.mb).toFixed(0)} MB` : undefined,
    }));

    return {
      _status: "ok",
      speed: queue.speed ?? "0 B/s",
      remaining: queue.timeleft ?? "—",
      queueSize: queue.noofslots ?? 0,
      downloading: queue.status === "Downloading",
      showDownloads,
      downloads: showDownloads ? downloads : [],
    };
  },
  toPayload: sabnzbdToPayload,
};
