import type { ServiceDefinition } from "./types";

type GlancesPerCpuData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  cores: number;
  maxCore: number;
  avgCpu: number;
  coreUsages: (number | null)[];
};
import { fetchWithTimeout } from "./fetch-with-timeout";

function glancesPerCpuToPayload({ coreUsages }: GlancesPerCpuData) {
  return {
    stats: (coreUsages ?? []).map((usage, index) => ({
      id: `core-${index}`,
      label: `CPU ${index + 1}`,
      value: typeof usage === "number" ? `${usage}%` : "—",
      valueClassName:
        (usage ?? 0) >= 90 ? "text-destructive" : (usage ?? 0) >= 70 ? "text-warning" : undefined,
    })),
  };
}

export const glancesPerCpuDefinition: ServiceDefinition<GlancesPerCpuData> = {
  id: "glances-percpu",
  name: "Glances Per-CPU",
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
    },
    {
      key: "password",
      label: "Password",
      type: "password",
      required: false,
    },
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "");
    const headers: Record<string, string> = {};

    if (config.username && config.password) {
      headers["Authorization"] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
    }

    const res = await fetchWithTimeout(`${baseUrl}/api/4/percpu`, { headers });
    if (!res.ok) throw new Error(`Glances error: ${res.status}`);

    const percpu = await res.json();
    const coreList = Array.isArray(percpu) ? percpu : [];

    const cpuValues = coreList.map((c: { total?: number }) =>
      typeof c.total === "number" ? c.total : null,
    );
    const measured = cpuValues.filter((value): value is number => value !== null);
    const maxCore = Math.max(...measured, 0);
    const avgCpu =
      measured.length > 0
        ? Math.round(measured.reduce((a: number, b: number) => a + b, 0) / measured.length)
        : 0;

    return {
      _status: "ok",
      cores: coreList.length,
      maxCore,
      avgCpu,
      coreUsages: cpuValues,
    };
  },
  toPayload: glancesPerCpuToPayload,
};
