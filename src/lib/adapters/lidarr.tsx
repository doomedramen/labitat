import type { ServiceDefinition } from "./types";
import { Download, Search, Music } from "lucide-react";

type LidarrData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  queued: number;
  wanted: number;
  artists: number;
};
import { fetchWithTimeout } from "./fetch-with-timeout";
import { cachedLibraryCount } from "./library-count-cache";

function lidarrToPayload(data: LidarrData) {
  return {
    stats: [
      {
        id: "wanted",
        value: (data.wanted ?? 0).toLocaleString(),
        label: "Wanted",
        icon: Search,
      },
      {
        id: "queued",
        value: (data.queued ?? 0).toLocaleString(),
        label: "Queued",
        icon: Download,
      },
      {
        id: "artists",
        value: (data.artists ?? 0).toLocaleString(),
        label: "Artists",
        icon: Music,
      },
    ],
  };
}

export const lidarrDefinition: ServiceDefinition<LidarrData> = {
  id: "lidarr",
  name: "Lidarr",
  icon: "lidarr",
  category: "downloads",
  defaultPollingMs: 10_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://lidarr.example.org",
      helperText: "The base URL of your Lidarr instance",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: true,
      placeholder: "Your Lidarr password or API key",
      helperText: "Found in Settings → General → Security",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "");
    const headers = { "X-Api-Key": config.apiKey };

    const [artistCount, wantedRes, queueRes] = await Promise.all([
      cachedLibraryCount(`lidarr:${baseUrl}:${config.apiKey}`, async () => {
        const res = await fetchWithTimeout(`${baseUrl}/api/v1/artist`, { headers });
        if (res.status === 401) throw new Error("Invalid API key");
        if (res.status === 404) throw new Error("Lidarr not found at this URL");
        if (!res.ok) throw new Error(`Lidarr error: ${res.status}`);
        const data = await res.json();
        return Array.isArray(data) ? data.length : 0;
      }),
      fetchWithTimeout(`${baseUrl}/api/v1/wanted/missing`, { headers }),
      fetchWithTimeout(`${baseUrl}/api/v1/queue/status`, { headers }),
    ]);

    const wantedData = wantedRes.ok ? await wantedRes.json() : { totalRecords: 0 };
    const queueData = queueRes.ok ? await queueRes.json() : { totalCount: 0 };

    return {
      _status: "ok" as const,
      queued: queueData.totalCount ?? 0,
      wanted: wantedData.totalRecords ?? 0,
      artists: artistCount,
    };
  },

  toPayload: lidarrToPayload,
};
