import type { ServiceDefinition } from "./types";

export type { GlancesTimeseriesData };
import { fetchWithTimeout } from "./fetch-with-timeout";

type DataPoint = {
  timestamp: number;
  cpu?: number;
  mem?: number;
  /** Additional metrics can be added dynamically */
  [key: string]: number | undefined;
};

type MetricConfig = {
  key: string;
  label: string;
  color: string;
  gradientId: string;
};

type GlancesTimeseriesData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  history: DataPoint[];
  /** Configurable metrics to display (defaults to cpu and mem) */
  metrics?: MetricConfig[];
};

export const glancesTimeseriesDefinition: ServiceDefinition<GlancesTimeseriesData> = {
  id: "glances-timeseries",
  name: "Glances Timeseries",
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
  ],
  async fetchData(config) {
    const baseUrl = config.url.replace(/\/$/, "");
    const headers: Record<string, string> = {};

    if (config.username && config.password) {
      headers["Authorization"] = `Basic ${btoa(`${config.username}:${config.password}`)}`;
    }

    // Fetch CPU and memory history in parallel
    const [cpuRes, memRes] = await Promise.all([
      fetchWithTimeout(`${baseUrl}/api/4/cpu/history/20`, { headers }),
      fetchWithTimeout(`${baseUrl}/api/4/mem/history/20`, { headers }),
    ]);

    if (!cpuRes.ok) throw new Error(`Glances CPU history error: ${cpuRes.status}`);
    if (!memRes.ok) throw new Error(`Glances mem history error: ${memRes.status}`);

    const cpuData = await cpuRes.json();
    const memData = await memRes.json();

    // CPU history: { "total": [[timestamp, value], ...], "user": [...], ... }
    // Mem history: { "percent": [[timestamp, value], ...], ... }
    const cpuEntries = cpuData.total ?? cpuData.user ?? [];
    const memEntries = memData.percent ?? [];

    // Build merged timeline
    const history: DataPoint[] = [];
    const maxLen = Math.max(cpuEntries.length, memEntries.length);

    for (let i = 0; i < maxLen; i++) {
      const cpuEntry = cpuEntries[i];
      const memEntry = memEntries[i];

      const timestamp = cpuEntry?.[0]
        ? new Date(cpuEntry[0]).getTime()
        : memEntry?.[0]
          ? new Date(memEntry[0]).getTime()
          : Date.now();

      history.push({
        timestamp,
        cpu: Math.round(cpuEntry?.[1] ?? 0),
        mem: Math.round(memEntry?.[1] ?? 0),
      });
    }

    return {
      _status: "ok",
      history,
    };
  },
  renderWidget: () => null, // Placeholder - real widget is client-side
};
