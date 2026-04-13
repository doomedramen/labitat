import type { ServiceDefinition } from "./types";
import { formatDuration, formatTimeAgo } from "@/lib/utils/format";
import { Camera, Clock, Tag } from "lucide-react";

type FrigateEvent = {
  id: string;
  camera: string;
  label: string;
  score: number;
  startTime: number;
  endTime?: number;
  thumbnail?: string;
};
import { fetchWithTimeout } from "./fetch-with-timeout";
import { parseBool } from "./validate";

type FrigateData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  cameras: number;
  uptime: number;
  version: string;
  showRecentEvents?: boolean;
  recentEvents?: FrigateEvent[];
};

function frigateToPayload(data: FrigateData) {
  return {
    stats: [
      {
        id: "cameras",
        value: (data.cameras ?? 0).toLocaleString(),
        label: "Cameras",
        icon: Camera,
      },
      {
        id: "uptime",
        value: formatDuration(data.uptime ?? 0),
        label: "Uptime",
        icon: Clock,
      },
      {
        id: "version",
        value: data.version,
        label: "Version",
        icon: Tag,
      },
    ],
    streams:
      data.showRecentEvents && data.recentEvents?.length
        ? data.recentEvents.map((event) => ({
            title: `${event.camera} (${event.label} ${(event.score * 100).toFixed(0)}%)`,
            subtitle: formatTimeAgo(Date.now() / 1000 - event.startTime),
            user: event.label,
            progress: 0,
            duration: 0,
            state: "playing" as const,
            streamId: event.id,
            transcoding: undefined,
          }))
        : undefined,
  };
}

export const frigateDefinition: ServiceDefinition<FrigateData> = {
  id: "frigate",
  name: "Frigate",
  icon: "frigate",
  category: "monitoring",
  defaultPollingMs: 30_000,

  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://frigate.example.org",
      helperText: "The base URL of your Frigate instance",
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: false,
      placeholder: "admin",
      helperText: "Required if Frigate has authentication enabled",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: false,
      placeholder: "Your Frigate password or API key",
    },
    {
      key: "showRecentEvents",
      label: "Show recent events",
      type: "boolean",
      helperText: "Display recent detection events",
    },
  ],

  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "");
    const showRecentEvents = parseBool(config.showRecentEvents);
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };

    // If credentials provided, login first
    if (config.username && config.password) {
      const loginRes = await fetchWithTimeout(`${baseUrl}/api/login`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          user: config.username,
          password: config.password,
        }),
      });

      if (!loginRes.ok) {
        throw new Error("Failed to authenticate with Frigate");
      }

      const cookie = loginRes.headers.get("set-cookie");
      if (cookie) {
        headers.Cookie = cookie;
      }
    }

    // Fetch stats and recent events in parallel
    const [statsRes, eventsRes] = await Promise.all([
      fetchWithTimeout(`${baseUrl}/api/stats`, { headers }),
      showRecentEvents
        ? fetchWithTimeout(`${baseUrl}/api/events?include_thumbnails=0&limit=5`, {
            headers,
          })
        : Promise.resolve(null),
    ]);

    if (!statsRes.ok) {
      if (statsRes.status === 401) throw new Error("Invalid credentials");
      if (statsRes.status === 404) throw new Error("Frigate not found at this URL");
      throw new Error(`Frigate error: ${statsRes.status}`);
    }

    const statsData = await statsRes.json();

    // Parse recent events
    const recentEvents: FrigateEvent[] = [];
    if (eventsRes && eventsRes.ok) {
      const eventsData = await eventsRes.json();
      if (Array.isArray(eventsData)) {
        for (const event of eventsData) {
          recentEvents.push({
            id: event.id ?? "",
            camera: event.camera ?? "Unknown",
            label: event.label ?? "unknown",
            score: event.score ?? 0,
            startTime: event.start_time ?? 0,
            endTime: event.end_time,
            thumbnail: event.thumbnail,
          });
        }
      }
    }

    return {
      _status: "ok" as const,
      cameras: statsData?.cameras !== undefined ? Object.keys(statsData.cameras).length : 0,
      uptime: statsData?.service?.uptime ?? 0,
      version: statsData?.service?.version ?? "unknown",
      showRecentEvents,
      recentEvents,
    };
  },

  toPayload: frigateToPayload,
};
