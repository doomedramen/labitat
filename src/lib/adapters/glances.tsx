import type { ServiceDefinition } from "./types";
import { formatBytes, formatDuration } from "@/lib/utils/format";
import { ArrowDownUp, Activity, Clock, Cpu, MemoryStick } from "lucide-react";

type GlancesData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  cpuPercent: number | null;
  memPercent: number | null;
  memUsed: string;
  swapPercent: number | null;
  load1: number | null;
  uptime: string;
};
import { fetchWithTimeout } from "./fetch-with-timeout";

function glancesToPayload(data: GlancesData) {
  return {
    stats: [
      { id: "cpu", value: `${data.cpuPercent ?? 0}%`, label: "CPU", icon: Cpu },
      {
        id: "memory",
        value: `${data.memPercent ?? 0}%`,
        label: "RAM",
        tooltip: data.memUsed,
        icon: MemoryStick,
      },
      { id: "swap", value: `${data.swapPercent ?? 0}%`, label: "Swap", icon: ArrowDownUp },
      { id: "load", value: (data.load1 ?? 0).toFixed(2), label: "Load", icon: Activity },
      { id: "uptime", value: data.uptime ?? "—", label: "Uptime", icon: Clock },
    ],
  };
}

export const glancesDefinition: ServiceDefinition<GlancesData> = {
  id: "glances",
  name: "Glances",
  icon: "glances",
  category: "monitoring",
  defaultPollingMs: 10_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "https://glances.example.org",
    },
    {
      key: "username",
      label: "Username",
      type: "text",
      required: false,
      placeholder: "Leave blank if no auth",
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: false,
      placeholder: "Leave blank if no auth",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "");
    const headers: Record<string, string> = {};

    if (config.username && config.password) {
      headers["Authorization"] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
    }

    const [quickRes, memRes] = await Promise.all([
      fetchWithTimeout(`${baseUrl}/api/4/quicklook`, { headers }),
      fetchWithTimeout(`${baseUrl}/api/4/mem`, { headers }),
    ]);

    if (!quickRes.ok) throw new Error(`Glances error: ${quickRes.status}`);

    const data = await quickRes.json();
    const memData = memRes.ok ? await memRes.json() : {};

    // Memory used: prefer /api/4/mem, fall back to quicklook calculation
    const memUsedBytes =
      memData.used ?? (data.memory_total ? ((data.mem ?? 0) * data.memory_total) / 100 : 0);

    // Load: quicklook may return an object {min1, cpucore} or a bare number
    const loadRaw = data.load;
    const loadMin1 = loadRaw && typeof loadRaw === "object" ? loadRaw.min1 : loadRaw;
    const loadCores = loadRaw && typeof loadRaw === "object" ? (loadRaw.cpucore ?? 1) : 1;
    const load1 =
      typeof loadMin1 === "number" ? (loadCores > 1 ? loadMin1 / loadCores : loadMin1) : null;

    // Uptime: may be seconds (number) or a pre-formatted string
    const uptimeRaw = data.uptime ?? 0;
    const uptime =
      typeof uptimeRaw === "string"
        ? uptimeRaw.replace(/^"|"$/g, "").trim() || "—"
        : formatDuration(uptimeRaw);

    return {
      _status: "ok",
      cpuPercent: typeof data.cpu === "number" ? data.cpu : null,
      memPercent: typeof data.mem === "number" ? data.mem : null,
      memUsed: memUsedBytes > 0 ? formatBytes(memUsedBytes) : "—",
      swapPercent: typeof data.swap === "number" ? data.swap : null,
      load1,
      uptime,
      _numeric:
        typeof data.uptime === "number"
          ? { uptime: { value: data.uptime, unit: "seconds" as const } }
          : {},
    };
  },
  toPayload: glancesToPayload,
};
