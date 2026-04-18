import type { ServiceDefinition } from "./types";
import type { DownloadItemData } from "@/components/widgets";
import { formatBytes, formatDuration } from "@/lib/utils/format";
import { validateResponse, validateArrayResponse, parseBool } from "./validate";
import { ArrowDown, ArrowUp, Download, List } from "lucide-react";

type QBittorrentData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  downSpeed: string;
  upSpeed: string;
  activeDownloads: number;
  queued: number;
  showDownloads?: boolean;
  downloads?: DownloadItemData[];
};
import { fetchWithTimeout } from "./fetch-with-timeout";

function formatSpeed(bytesPerSec: number): string {
  return `${formatBytes(bytesPerSec)}/s`;
}

function qbittorrentToPayload(data: QBittorrentData) {
  return {
    stats: [
      {
        id: "down",
        value: data.downSpeed,
        label: "Down",
        icon: ArrowDown,
      },
      {
        id: "up",
        value: data.upSpeed,
        label: "Up",
        icon: ArrowUp,
      },
      {
        id: "active",
        value: data.activeDownloads,
        label: "Active",
        icon: Download,
      },
      {
        id: "queued",
        value: data.queued,
        label: "Queued",
        icon: List,
      },
    ],
    downloads: data.showDownloads && data.downloads?.length ? data.downloads : undefined,
  };
}

export const qbittorrentDefinition: ServiceDefinition<QBittorrentData> = {
  id: "qbittorrent",
  name: "qBittorrent",
  icon: "qbittorrent",
  category: "downloads",
  defaultPollingMs: 10_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://qbittorrent.example.org",
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: true,
      placeholder: "admin",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: true,
      placeholder: "Your qBittorrent password",
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

    // Login
    const loginRes = await fetchWithTimeout(`${baseUrl}/api/v2/auth/login`, {
      method: "POST",
      body: new URLSearchParams({
        username: config.username,
        password: config.password,
      }),
    });
    if (!loginRes.ok) throw new Error(`qBittorrent login failed: ${loginRes.status}`);
    // qBittorrent returns HTTP 200 with body "Fails." on bad credentials
    const loginBody = await loginRes.text();
    if (loginBody.trim() === "Fails.")
      throw new Error("qBittorrent login failed: invalid credentials");
    const cookie = loginRes.headers.getSetCookie?.()[0] ?? "";

    const headers = { Cookie: cookie };

    // Get transfer info, torrent list, and queued count
    const [infoRes, torrentsRes, queuedRes] = await Promise.all([
      fetchWithTimeout(`${baseUrl}/api/v2/transfer/info`, { headers }),
      fetchWithTimeout(`${baseUrl}/api/v2/torrents/info?filter=downloading`, {
        headers,
      }),
      fetchWithTimeout(`${baseUrl}/api/v2/torrents/info?filter=queuedDL`, {
        headers,
      }),
    ]);

    if (!infoRes.ok) throw new Error(`qBittorrent error: ${infoRes.status}`);

    const info = validateResponse<{
      dl_info_speed?: number;
      up_info_speed?: number;
    }>(await infoRes.json(), ["dl_info_speed", "up_info_speed"], [], {
      adapter: "qbittorrent",
    });
    const torrents = torrentsRes.ok
      ? validateArrayResponse<{
          state: string;
          dlspeed: number;
          name: string;
          progress: number;
          eta: number;
          size: number;
        }>(await torrentsRes.json(), {
          adapter: "qbittorrent",
          optional: true,
        })
      : [];
    const queuedRaw = queuedRes.ok
      ? validateArrayResponse(await queuedRes.json(), {
          adapter: "qbittorrent",
          optional: true,
        })
      : [];
    const queued = queuedRaw.length;

    // Build active download list with state-priority sorting
    // State priority (like Homepage): downloading > forcedDL > metaDL > stalledDL > queuedDL > pausedDL
    const statePriority: Record<string, number> = {
      downloading: 0,
      forcedDL: 1,
      metaDL: 2,
      stalledDL: 3,
      queuedDL: 4,
      pausedDL: 5,
    };

    const downloads: DownloadItemData[] = torrents
      .sort((a: { state: string; dlspeed: number }, b: { state: string; dlspeed: number }) => {
        // First sort by state priority
        const stateA = statePriority[a.state] ?? 99;
        const stateB = statePriority[b.state] ?? 99;
        if (stateA !== stateB) return stateA - stateB;
        // Then by download speed (descending)
        return b.dlspeed - a.dlspeed;
      })
      .slice(0, 5)
      .map(
        (t: {
          name: string;
          progress: number;
          eta: number;
          dlspeed: number;
          size: number;
          state: string;
        }) => {
          // Map qBittorrent states to user-friendly labels
          let activity = "downloading";
          if (t.state === "stalledDL") activity = "Stalled";
          else if (t.state === "queuedDL") activity = "Queued";
          else if (t.state === "pausedDL") activity = "Paused";
          else if (t.state === "metaDL") activity = "Fetching metadata";
          else if (t.state === "forcedDL") activity = "Forced downloading";

          return {
            title: t.name.replaceAll(".", " "),
            progress: Math.round(t.progress * 100),
            timeLeft: formatDuration(t.eta),
            activity,
            size: formatBytes(t.size),
          };
        },
      );

    return {
      _status: "ok",
      downSpeed: formatSpeed(info.dl_info_speed ?? 0),
      upSpeed: formatSpeed(info.up_info_speed ?? 0),
      activeDownloads: torrents.length,
      queued,
      showDownloads,
      downloads: showDownloads ? downloads : [],
    };
  },
  toPayload: qbittorrentToPayload,
};
