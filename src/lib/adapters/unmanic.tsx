import type { ServiceDefinition } from "./types";
import { Loader, List, CheckCircle, Trophy, Users } from "lucide-react";

type UnmanicData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  activeWorkers: number;
  totalWorkers: number;
  queuedItems: number;
  completedToday: number;
  totalCompleted: number;
};
import { fetchWithTimeout } from "./fetch-with-timeout";

function unmanicToPayload(data: UnmanicData) {
  return {
    stats: [
      {
        id: "active",
        value: data.activeWorkers,
        label: "Active",
        icon: Loader,
      },
      {
        id: "total",
        value: data.totalWorkers,
        label: "Total",
        icon: Users,
      },
      {
        id: "queued",
        value: data.queuedItems,
        label: "Queued",
        icon: List,
      },
      {
        id: "today",
        value: data.completedToday,
        label: "Today",
        icon: CheckCircle,
      },
      {
        id: "completed",
        value: data.totalCompleted,
        label: "Completed",
        icon: Trophy,
      },
    ],
  };
}

export const unmanicDefinition: ServiceDefinition<UnmanicData> = {
  id: "unmanic",
  name: "Unmanic",
  icon: "unmanic",
  category: "media",
  defaultPollingMs: 10_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://unmanic.example.org",
    },
    {
      key: "apiKey",
      label: "API Key",
      type: "password",
      required: false,
      placeholder: "Your Unmanic API key (if enabled)",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "");
    const headers: Record<string, string> = {
      "Content-Type": "application/json",
    };
    if (config.apiKey) {
      headers["X-API-Key"] = config.apiKey;
    }

    const [workersRes, pendingRes] = await Promise.all([
      fetchWithTimeout(`${baseUrl}/unmanic/api/v2/workers/status`, { headers }),
      fetchWithTimeout(`${baseUrl}/unmanic/api/v2/pending/tasks`, {
        method: "POST",
        headers,
        body: JSON.stringify({}),
      }),
    ]);

    if (!workersRes.ok || !pendingRes.ok) {
      throw new Error(`Unmanic error: workers=${workersRes.status}, pending=${pendingRes.status}`);
    }

    const workersData = await workersRes.json();
    const pendingData = await pendingRes.json();

    const workersStatus = workersData.workers_status ?? [];
    const totalWorkers = workersStatus.length;
    const activeWorkers = workersStatus.filter((w: { idle?: boolean }) => !w.idle).length;

    return {
      _status: "ok",
      activeWorkers,
      totalWorkers,
      queuedItems: pendingData.recordsTotal ?? 0,
      completedToday: 0,
      totalCompleted: 0,
    };
  },
  toPayload: unmanicToPayload,
};
