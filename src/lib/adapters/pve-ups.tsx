import type { ServiceDefinition } from "./types";
import { Zap, Battery, Clock, ShieldCheck, ShieldAlert, Server, BellRing } from "lucide-react";
import { fetchWithTimeout } from "./fetch-with-timeout";

/** A single UPS as reported by PVE-UPS `GET /api/status` → `ups[]`. */
type PveUpsEntry = {
  id?: string;
  name?: string;
  type?: string;
  mib?: string;
  reachable?: boolean;
  manufacturer?: string;
  model?: string;
  power_source?: string;
  battery_status?: string;
  battery_charge_pct?: number | null;
  load_pct?: number | null;
  runtime_remaining_min?: number | null;
  seconds_on_battery?: number | null;
  triggered?: boolean;
  trigger_reason?: string | null;
  alarm?: boolean;
  error?: string | null;
};

/** A shutdown target (Proxmox VE node or PBS) from `hosts[]`. */
type PveUpsHost = {
  name?: string;
  type?: string;
  enabled?: boolean;
  reachable?: boolean | null;
  credentials_ok?: boolean | null;
  power_mgmt_ok?: boolean | null;
  last_test_error?: string | null;
};

/** `GET /api/health` — monitoring counters, deliberately excluded from `status`. */
type PveUpsHealth = {
  status?: string;
  version?: string;
  engine_state?: string;
  dry_run?: boolean;
  ups_reachable?: boolean;
  ups_reachable_count?: number;
  ups_total?: number;
  hosts_total?: number;
  hosts_ok?: number;
  hosts_selftest_ok?: boolean | null;
  webhooks_total?: number;
  webhooks_ok?: number;
};

type PveUpsData = {
  _status?: "ok" | "warn" | "error";
  _statusText?: string;
  /** Per-shutdown-target summary for the tooltip. */
  hostsDetail: string;
  /** "mains" | "battery" | "bypass" | "none" | "other" | "unknown" */
  powerSource: string;
  batteryStatus: string;
  loadPercent: number;
  batteryCharge: number;
  /** Minutes, as reported by the appliance. Negative or null means "not applicable". */
  runtimeMinutes: number;
  dryRun: boolean;
  hostsOk: number;
  hostsTotal: number;
  /** WARNING + CRITICAL entries in the appliance's 48h event log. */
  eventCount: number;
  version: string;
  /** Human summary of every UPS behind the numbers, for the tooltip. */
  detail: string;
};

const POWER_SOURCE_LABELS: Record<string, string> = {
  mains: "Mains",
  battery: "On battery",
  bypass: "Bypass",
  none: "No output",
  other: "Other",
  unknown: "Unknown",
};

const BATTERY_STATUS_LABELS: Record<string, string> = {
  normal: "Normal",
  low: "Low",
  depleted: "Depleted",
  unknown: "Unknown",
};

/**
 * PVE-UPS reports runtime in minutes and leaves it null while on mains (RFC 1628
 * leaves upsSecondsOnEstimateTemp undefined there, and the appliance deliberately
 * refuses to show a stale transfer's counter as a multi-day runtime).
 */
function formatRuntime(minutes: number | null): string {
  if (minutes === null || minutes < 0) return "—";
  if (minutes < 1) return "<1m";
  if (minutes < 60) return `${Math.round(minutes)}m`;
  const hours = Math.floor(minutes / 60);
  const mins = Math.round(minutes % 60);
  return mins > 0 ? `${hours}h ${mins}m` : `${hours}h`;
}

/**
 * When more than one UPS is configured, the head-line numbers have to be rolled up.
 * Worst-case-wins throughout: an aggregate that averages a healthy UPS with an
 * unreachable one is a number nobody should act on.
 */
type Rollup = {
  powerSource: string;
  batteryStatus: string;
  loadPercent: number;
  batteryCharge: number;
  runtimeMinutes: number;
  unreachable: number;
  onBattery: number;
  detail: string;
};

function rollupUps(list: PveUpsEntry[]): Rollup {
  if (list.length === 0) {
    return {
      powerSource: "unknown",
      batteryStatus: "unknown",
      loadPercent: 0,
      batteryCharge: 0,
      runtimeMinutes: -1,
      unreachable: 0,
      onBattery: 0,
      detail: "No UPS configured",
    };
  }

  const unreachable = list.filter((u) => u.reachable === false).length;
  const onBattery = list.filter((u) => u.power_source === "battery").length;
  const triggered = list.filter((u) => u.triggered).length;

  // An unreachable device outranks everything, then an active battery, then bypass.
  let powerSource = "mains";
  if (unreachable > 0) powerSource = "unknown";
  else if (onBattery > 0) powerSource = "battery";
  else if (list.some((u) => u.power_source === "bypass")) powerSource = "bypass";
  else if (list.every((u) => u.power_source === "unknown")) powerSource = "unknown";
  else if (!list.some((u) => u.power_source === "mains")) powerSource = "other";

  const batteryStatus = list.some((u) => u.battery_status === "depleted")
    ? "depleted"
    : list.some((u) => u.battery_status === "low")
      ? "low"
      : "normal";

  // Percentages: mean for load (a genuine utilisation figure), floor for charge.
  const loadValues = list.map((u) => u.load_pct).filter((v): v is number => typeof v === "number");
  const chargeValues = list
    .map((u) => u.battery_charge_pct)
    .filter((v): v is number => typeof v === "number");
  const runtimes = list
    .map((u) => u.runtime_remaining_min)
    .filter((v): v is number => typeof v === "number" && v >= 0);

  const name = (u: PveUpsEntry) => u.name || u.id || "UPS";
  const detail =
    list.length === 1
      ? list[0]?.manufacturer && list[0]?.model
        ? `${list[0].manufacturer} ${list[0].model}`
        : name(list[0]!)
      : list
          .map((u) => {
            const bits: string[] = [name(u)];
            if (u.power_source) bits.push(POWER_SOURCE_LABELS[u.power_source] ?? u.power_source);
            if (u.reachable === false) bits.push("unreachable");
            if (u.triggered)
              bits.push(`triggered${u.trigger_reason ? `: ${u.trigger_reason}` : ""}`);
            return bits.join(", ");
          })
          .join("\n") + (triggered > 1 ? `\n${triggered} UPS triggered` : "");

  return {
    powerSource,
    batteryStatus,
    loadPercent: loadValues.length ? loadValues.reduce((a, b) => a + b, 0) / loadValues.length : 0,
    batteryCharge: chargeValues.length ? Math.min(...chargeValues) : 0,
    runtimeMinutes: runtimes.length ? Math.min(...runtimes) : -1,
    unreachable,
    onBattery,
    detail,
  };
}

/**
 * Losing contact with a UPS is an alarm in PVE-UPS, never a confirmed outage — the
 * same fail-safe rule it applies to the shutdown decision. Mirroring it here means the
 * dashboard never shows "On battery" for a device that simply stopped answering.
 */
function mapStatus(
  r: Rollup,
  data: { hostsOk: number; hostsTotal: number; hostsKnown: boolean },
): {
  status: "ok" | "warn" | "error";
  text?: string;
} {
  if (r.unreachable > 0) {
    return {
      status: "error",
      text:
        r.unreachable === 1
          ? "A UPS is unreachable — alarm raised, no shutdown armed"
          : `${r.unreachable} UPS devices unreachable — alarm raised, no shutdown armed`,
    };
  }
  if (r.onBattery > 0) {
    return {
      status: "warn",
      text:
        r.onBattery === 1
          ? "Running on battery"
          : `${r.onBattery} UPS devices on battery — shutdown countdown may be running`,
    };
  }
  if (r.batteryStatus === "low") {
    return { status: "warn", text: "UPS reports a low battery" };
  }
  if (data.hostsKnown && data.hostsTotal > 0 && data.hostsOk < data.hostsTotal) {
    const unverified = data.hostsTotal - data.hostsOk;
    return {
      status: "warn",
      text: `${unverified} shutdown target${unverified === 1 ? "" : "s"} failed the last self-test`,
    };
  }
  return { status: "ok" };
}

function pveUpsToPayload(data: PveUpsData) {
  const powerLabel =
    data.powerSource === "unknown" && data.batteryStatus !== "low"
      ? "Unknown"
      : (POWER_SOURCE_LABELS[data.powerSource] ?? data.powerSource);

  const armed = !data.dryRun;

  return {
    stats: [
      {
        id: "status",
        value: powerLabel,
        label: "Power",
        icon: Zap,
        tooltip: data.detail,
      },
      {
        id: "load",
        value: `${(data.loadPercent ?? 0).toFixed(0)}%`,
        label: "Load",
        icon: Zap,
      },
      {
        id: "battery",
        value: `${Math.round(data.batteryCharge ?? 0)}%`,
        label: "Battery",
        icon: Battery,
        tooltip: BATTERY_STATUS_LABELS[data.batteryStatus] ?? data.batteryStatus,
      },
      {
        id: "runtime",
        value: formatRuntime(data.runtimeMinutes ?? null),
        label: "Runtime",
        icon: Clock,
      },
      {
        id: "arm",
        value: armed ? "Armed" : "Dry run",
        label: "Mode",
        icon: armed ? ShieldCheck : ShieldAlert,
        tooltip: armed
          ? "Shutdown is armed — hosts will be powered off on a confirmed outage"
          : "Dry run is on — nothing will be shut down",
        valueClassName: armed ? "" : "text-amber-500",
      },
      {
        id: "targets",
        value: data.hostsTotal > 0 ? `${data.hostsOk}/${data.hostsTotal}` : "—",
        label: "Targets",
        icon: Server,
        tooltip: data.hostsDetail || "Shutdown targets that passed their last self-test",
      },
      {
        id: "events",
        value: data.eventCount,
        label: "Events",
        icon: BellRing,
        tooltip: `Warnings and errors in the last 48h (v${data.version || "?"})`,
      },
    ],
    defaultActiveIds: ["status", "load", "battery", "runtime"],
  };
}

export const pveUpsDefinition: ServiceDefinition<PveUpsData> = {
  id: "pve-ups",
  name: "PVE UPS",
  icon: "pve-ups",
  category: "monitoring",
  defaultPollingMs: 15_000,
  configFields: [
    {
      key: "url",
      label: "URL",
      type: "url",
      required: true,
      placeholder: "http://192.168.1.50:8080",
      helperText: "Base URL of the PVE-UPS container (port 8080)",
    },
    {
      key: "upsId",
      label: "UPS",
      type: "text",
      required: false,
      placeholder: "ups",
      helperText:
        "Leave blank to roll up every configured UPS (worst-case wins). Set an id to pin one device.",
    },
  ],
  async fetchData(config) {
    const baseUrl = (config.url ?? "").replace(/\/$/, "");

    if (!baseUrl) {
      throw new Error("URL is required");
    }

    // Both endpoints are deliberately public, read-only and secret-free so an external
    // monitor can poll them. /api/health answers 503 when the engine task is dead, which
    // is a valid answer rather than a failure — read the body either way.
    const [statusRes, healthRes] = await Promise.all([
      fetchWithTimeout(`${baseUrl}/api/status`),
      fetchWithTimeout(`${baseUrl}/api/health`),
    ]);

    if (!statusRes.ok) {
      throw new Error(`PVE-UPS error: ${statusRes.status}`);
    }

    const body = (await statusRes.json()) as {
      appliance?: {
        dry_run?: boolean;
        engine_state?: string;
        alarm?: boolean;
        version?: string;
      };
      ups?: PveUpsEntry[];
      hosts?: PveUpsHost[];
      events_summary?: Record<string, number>;
    };

    // A 503 from /api/health means the engine task is dead — but the body still carries the
    // monitoring counters, so read it on any response that parses. Counters that are
    // genuinely absent are *unknown*, not zero: treating a missing hosts_ok as 0 would
    // report every shutdown target as having failed its self-test.
    const health = await healthRes.json().catch(() => ({}) as PveUpsHealth);
    const healthReadable = typeof health.hosts_total === "number";

    const allUps = Array.isArray(body.ups) ? body.ups : [];
    const wanted = config.upsId?.trim();
    const selected = wanted ? allUps.filter((u) => u.id === wanted || u.name === wanted) : allUps;

    if (wanted && selected.length === 0) {
      throw new Error(
        `No UPS matching "${wanted}" — configured ids: ${
          allUps.map((u) => u.id ?? u.name ?? "?").join(", ") || "none"
        }`,
      );
    }

    const roll = rollupUps(selected);

    const hostList = Array.isArray(body.hosts) ? body.hosts : [];
    // /api/health counts a target ok only once its self-test confirmed both the
    // credentials and the power-management privilege. Recompute the same figure from
    // /api/status when health is unreadable, so the count is never a bare zero.
    const hostsOk = healthReadable
      ? (health.hosts_ok ?? 0)
      : hostList.filter((h) => h.enabled !== false && h.credentials_ok && h.power_mgmt_ok).length;
    const hostsTotal = health.hosts_total ?? hostList.length;
    const hostsDetail = hostList
      .map((h) => {
        const label = h.name || "host";
        if (h.enabled === false) return `${label} (disabled)`;
        if (!h.credentials_ok || !h.power_mgmt_ok) {
          return `${label} (self-test failed${h.last_test_error ? `: ${h.last_test_error}` : ""})`;
        }
        return `${label} (ok)`;
      })
      .join("\n");

    const eventCount = (body.events_summary?.WARNING ?? 0) + (body.events_summary?.CRITICAL ?? 0);

    const mapped = mapStatus(roll, { hostsOk, hostsTotal, hostsKnown: healthReadable });

    // The appliance's own alarm outranks the per-UPS rollup: it is the state that means
    // something is already wrong, whatever the individual UPS entries still report.
    const status = body.appliance?.alarm === true ? ("error" as const) : mapped.status;
    const text = body.appliance?.alarm === true ? "Appliance alarm is active" : mapped.text;

    return {
      _status: status,
      _statusText: text,
      powerSource: roll.powerSource,
      batteryStatus: roll.batteryStatus,
      loadPercent: roll.loadPercent,
      batteryCharge: roll.batteryCharge,
      runtimeMinutes: roll.runtimeMinutes,
      dryRun: body.appliance?.dry_run ?? health.dry_run ?? true,
      hostsOk,
      hostsTotal,
      hostsDetail,
      eventCount,
      version: body.appliance?.version ?? health.version ?? "",
      detail: roll.detail,
    };
  },
  toPayload: pveUpsToPayload,
};
