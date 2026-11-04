import type { ServiceDefinition } from "./types";
import { formatBytes } from "@/lib/utils/format";
import { WidgetStatGrid } from "@/components/dashboard/item/widget-stat-grid";
import { ResourceBar } from "@/components/widgets";
import { HardDrive, FolderOpen, Archive } from "lucide-react";

type GlancesDiskUsageData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  usedPercent: number | null;
  used: string;
  total: string;
  free: string;
};
import { fetchWithTimeout } from "./fetch-with-timeout";

function GlancesDiskUsageWidget({ usedPercent, used, total, free }: GlancesDiskUsageData) {
  return (
    <div className="flex flex-col gap-2 text-xs">
      <ResourceBar
        label="Disk"
        value={usedPercent ?? 0}
        hint={`${used} / ${total}`}
        warningAt={75}
        criticalAt={90}
      />
      <WidgetStatGrid
        items={[
          {
            id: "used",
            value: used ?? "—",
            label: "Used",
            icon: FolderOpen,
          },
          {
            id: "free",
            value: free ?? "—",
            label: "Free",
            icon: HardDrive,
          },
          {
            id: "total",
            value: total ?? "—",
            label: "Total",
            icon: Archive,
          },
        ]}
      />
    </div>
  );
}

export const glancesDiskUsageDefinition: ServiceDefinition<GlancesDiskUsageData> = {
  id: "glances-diskusage",
  name: "Glances Disk Usage",
  icon: "glances",
  category: "monitoring",
  defaultPollingMs: 15_000,
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
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: false,
    },
    {
      key: "mountPoint",
      label: "Mount Point",
      type: "text",
      required: false,
      placeholder: "/",
      helperText: "Leave blank for root (/)",
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "");
    const headers: Record<string, string> = {};

    if (config.username && config.password) {
      headers["Authorization"] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
    }

    const mountPoint = config.mountPoint || "/";
    const res = await fetchWithTimeout(`${baseUrl}/api/4/fs/${encodeURIComponent(mountPoint)}`, {
      headers,
    });
    if (!res.ok) throw new Error(`Glances error: ${res.status}`);

    const data = await res.json();
    const total = data.size ?? 0;
    const used = data.used ?? 0;
    const free = data.free ?? 0;
    const usedPercent = total > 0 && typeof data.used === "number" ? (used / total) * 100 : null;

    return {
      _status: "ok",
      usedPercent,
      _numeric: {
        ...(typeof data.used === "number" ? { used: { value: used, unit: "bytes" as const } } : {}),
        ...(typeof data.free === "number" ? { free: { value: free, unit: "bytes" as const } } : {}),
        ...(typeof data.size === "number"
          ? { total: { value: total, unit: "bytes" as const } }
          : {}),
      },
      used: typeof data.used === "number" ? formatBytes(used) : "—",
      total: typeof data.size === "number" ? formatBytes(total) : "—",
      free: typeof data.free === "number" ? formatBytes(free) : "—",
    };
  },
  toPayload: (data) => ({
    stats: [
      { id: "disk", label: "Disk", value: data.usedPercent == null ? "—" : `${data.usedPercent}%` },
      { id: "used", label: "Used", value: data.used },
      { id: "free", label: "Free", value: data.free },
      { id: "total", label: "Total", value: data.total },
    ],
  }),
  renderWidget: GlancesDiskUsageWidget,
};
