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

    const [artistsRes, wantedRes, queueRes] = await Promise.all([
      fetchWithTimeout(`${baseUrl}/api/v1/artist`, { headers }),
      fetchWithTimeout(`${baseUrl}/api/v1/wanted/missing`, { headers }),
      fetchWithTimeout(`${baseUrl}/api/v1/queue/status`, { headers }),
    ]);

    if (!artistsRes.ok) {
      if (artistsRes.status === 401) throw new Error("Invalid API key");
      if (artistsRes.status === 404) throw new Error("Lidarr not found at this URL");
      throw new Error(`Lidarr error: ${artistsRes.status}`);
    }

    const artistsData = await artistsRes.json();
    const wantedData = wantedRes.ok ? await wantedRes.json() : { totalRecords: 0 };
    const queueData = queueRes.ok ? await queueRes.json() : { totalCount: 0 };

    return {
      _status: "ok" as const,
      queued: queueData.totalCount ?? 0,
      wanted: wantedData.totalRecords ?? 0,
      artists: artistsData.length,
    };
  },

  toPayload: lidarrToPayload,
};
