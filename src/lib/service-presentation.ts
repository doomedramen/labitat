import type { ServiceData, ServiceDefinition } from "@/lib/adapters/types";
import type { StatItem } from "@/components/widgets/stat-card/types";

export type MetricUnit =
  | "count"
  | "percent"
  | "bytes"
  | "bytes/s"
  | "seconds"
  | "celsius"
  | "rpm"
  | "watts"
  | "volts"
  | "fahrenheit"
  | "m/s"
  | "mph"
  | "km/h";
export type ServiceMetric = {
  id: string;
  label: string;
  displayValue: string;
  numericValue?: number;
  unit?: MetricUnit;
};
export type ServicePresentation = {
  metrics: ServiceMetric[];
  defaultActiveIds?: string[];
  unavailable: boolean;
  detailKind: "standard" | "chart" | "processes" | "clock" | "search" | "visual";
};
const canonicalUnits = new Set<MetricUnit>([
  "count",
  "percent",
  "bytes",
  "bytes/s",
  "seconds",
  "celsius",
  "rpm",
  "watts",
  "volts",
  "fahrenheit",
  "m/s",
  "mph",
  "km/h",
]);
export type NumericObservation = { value: number; unit: MetricUnit };

// Native fields only: formatted display strings are never reverse-parsed.
const sources: Record<string, Record<string, [string, MetricUnit]>> = {
  glances: {
    cpu: ["cpuPercent", "percent"],
    memory: ["memPercent", "percent"],
    swap: ["swapPercent", "percent"],
    load: ["load1", "count"],
  },
  "glances-percpu": {},
  "glances-sensors": {
    "cpu-temp": ["cpuTemp", "celsius"],
    "max-temp": ["maxTemp", "celsius"],
    "fan-speed": ["fanSpeed", "rpm"],
  },
  "glances-diskusage": { disk: ["usedPercent", "percent"] },
  immich: { storage: ["storage", "bytes"] },
  proxmox: { cpu: ["cpuUsage", "percent"], memory: ["memoryUsage", "percent"] },
  "proxmox-backup-server": {
    failed: ["failedTasks", "count"],
    usage: ["usagePercent", "percent"],
    cpu: ["cpuUsage", "percent"],
    memory: ["memoryUsage", "percent"],
  },
  adguard: {
    rate: ["blockedPercent", "percent"],
    queries: ["queries", "count"],
    blocked: ["blocked", "count"],
    parental: ["parentalBlocked", "count"],
    safe: ["safeSearchBlocked", "count"],
  },
  emby: {
    active: ["activeStreams", "count"],
    movies: ["movies", "count"],
    shows: ["shows", "count"],
    episodes: ["episodes", "count"],
    songs: ["songs", "count"],
  },
  frigate: { cameras: ["cameras", "count"], uptime: ["uptime", "seconds"] },
  traefik: {
    routers: ["routers", "count"],
    services: ["services", "count"],
    middlewares: ["middlewares", "count"],
  },
  lidarr: {
    wanted: ["wanted", "count"],
    queued: ["queued", "count"],
    artists: ["artists", "count"],
  },
  jackett: { configured: ["configured", "count"], errored: ["errored", "count"] },
  portainer: {
    running: ["running", "count"],
    stopped: ["stopped", "count"],
    total: ["total", "count"],
  },
  grafana: {
    dashboards: ["dashboards", "count"],
    datasources: ["datasources", "count"],
    "total-alerts": ["totalAlerts", "count"],
    "alerts-triggered": ["alertsTriggered", "count"],
  },
  pihole: {
    queries: ["queries", "count"],
    blocked: ["blocked", "count"],
    domains: ["domainsBlocked", "count"],
  },
  "uptime-kuma": { up: ["up", "count"], down: ["down", "count"], uptime: ["uptime", "percent"] },
  "pve-ups": { load: ["loadPercent", "percent"], battery: ["batteryCharge", "percent"] },
  homeassistant: {
    entities: ["entities", "count"],
    sensors: ["sensors", "count"],
    lights: ["lights", "count"],
    switches: ["switches", "count"],
  },
  transmission: { down: ["download", "bytes/s"], upload: ["upload", "bytes/s"] },
  nut: {
    load: ["loadPercent", "percent"],
    batterycharge: ["batteryCharge", "percent"],
    runtime: ["runtimeSeconds", "seconds"],
  },
  openmeteo: {
    temp: ["temperature", "celsius"],
    humidity: ["humidity", "percent"],
    wind: ["windSpeed", "km/h"],
  },
  apcups: { load: ["loadPercent", "percent"], batterycharge: ["batteryCharge", "percent"] },
};

function nativeObservation(
  serviceId: string,
  stat: StatItem,
  data: ServiceData,
): NumericObservation | undefined {
  const explicit = data._numeric as Record<string, NumericObservation> | undefined;
  const candidate = explicit?.[stat.id];
  if (
    candidate &&
    canonicalUnits.has(candidate.unit) &&
    typeof candidate.value === "number" &&
    Number.isFinite(candidate.value)
  )
    return candidate;
  const milliseconds =
    serviceId === "adguard" && stat.id === "latency"
      ? data.latency
      : serviceId === "generic-ping" && stat.id === "response"
        ? data.responseTime
        : undefined;
  if (typeof milliseconds === "number" && Number.isFinite(milliseconds))
    return { value: milliseconds / 1000, unit: "seconds" };
  if (serviceId === "openweathermap") {
    const key = (
      {
        temp: "temperature",
        "feels-like": "feelsLike",
        humidity: "humidity",
        wind: "windSpeed",
      } as Record<string, string>
    )[stat.id];
    const value = data[key];
    const unit =
      stat.id === "humidity"
        ? "percent"
        : stat.id === "wind"
          ? data.speedUnit === "mph"
            ? "mph"
            : "m/s"
          : data.unitSymbol === "°F"
            ? "fahrenheit"
            : "celsius";
    if (typeof value === "number" && Number.isFinite(value)) return { value, unit };
  }
  const source = sources[serviceId]?.[stat.id];
  if (source && typeof data[source[0]] === "number" && Number.isFinite(data[source[0]]))
    return { value: data[source[0]] as number, unit: source[1] };
  if (
    serviceId === "glances-percpu" &&
    /^core-\d+$/.test(stat.id) &&
    Array.isArray(data.coreUsages)
  ) {
    const value = data.coreUsages[Number(stat.id.slice(5))];
    if (typeof value === "number" && Number.isFinite(value)) return { value, unit: "percent" };
  }
  return typeof stat.value === "number" && Number.isFinite(stat.value)
    ? { value: stat.value, unit: "count" }
    : undefined;
}

export function getServicePresentation(
  service: ServiceDefinition | null | undefined,
  data: ServiceData | null,
): ServicePresentation {
  const detailKind =
    service?.id === "glances-timeseries"
      ? "chart"
      : service?.id === "glances-processes"
        ? "processes"
        : service?.id === "datetime"
          ? "clock"
          : service?.id === "search"
            ? "search"
            : ["matrix", "pipes"].includes(service?.id ?? "")
              ? "visual"
              : "standard";
  const empty: ServicePresentation = {
    metrics: [],
    unavailable: !data || data._status === "error",
    detailKind,
  };
  if (!service || !data || data._status === "error") return empty;
  try {
    if (service.toMetrics) return { ...service.toMetrics(data), unavailable: false, detailKind };
    const payload = service.toPayload?.(data);
    const metrics = (payload?.stats ?? []).map((stat) => {
      const observation = nativeObservation(service.id, stat, data);
      return {
        id: stat.id,
        label: stat.label,
        displayValue:
          (sources[service.id]?.[stat.id] && data[sources[service.id][stat.id][0]] == null) ||
          stat.value == null ||
          (typeof stat.value === "number" && !Number.isFinite(stat.value))
            ? "—"
            : String(stat.value),
        ...(observation ? { numericValue: observation.value, unit: observation.unit } : {}),
      };
    });
    return { metrics, defaultActiveIds: payload?.defaultActiveIds, unavailable: false, detailKind };
  } catch {
    return { ...empty, unavailable: true };
  }
}

export function compactMetric(metric: ServiceMetric): string {
  if (metric.numericValue !== undefined && (metric.unit === "bytes" || metric.unit === "bytes/s"))
    return `${new Intl.NumberFormat("en", { notation: "compact", maximumSignificantDigits: 2 }).format(metric.numericValue)}${metric.unit === "bytes/s" ? "B/s" : "B"}`;
  if (metric.numericValue !== undefined && metric.unit === "percent")
    return `${new Intl.NumberFormat("en", { maximumFractionDigits: 1 }).format(metric.numericValue)}%`;
  if (metric.numericValue === undefined || metric.unit !== "count")
    return metric.displayValue.replace(/\s+(?=(?:[KMGTPE]i?)?B(?:\/s)?$)/, "");
  return new Intl.NumberFormat("en", {
    notation: Math.abs(metric.numericValue) >= 10000 ? "compact" : "standard",
    maximumFractionDigits: 1,
  }).format(metric.numericValue);
}

/** Details retain every native digit and its unit, including capped overview counts. */
export function fullMetric(metric: ServiceMetric): string {
  if (metric.numericValue === undefined || !metric.unit) return metric.displayValue;
  const units: Record<MetricUnit, string> = {
    count: "",
    percent: "%",
    bytes: " B",
    "bytes/s": " B/s",
    seconds: " s",
    celsius: "°C",
    fahrenheit: "°F",
    rpm: " RPM",
    watts: " W",
    volts: " V",
    "m/s": " m/s",
    mph: " mph",
    "km/h": " km/h",
  };
  return `${new Intl.NumberFormat("en", { maximumFractionDigits: 20 }).format(metric.numericValue)}${units[metric.unit]}`;
}
