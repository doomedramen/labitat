import { describe, it, expect, vi, beforeEach, afterEach } from "vitest";
import { pveUpsDefinition } from "@/lib/adapters/pve-ups";

type MockResponse = {
  ok: boolean;
  status?: number;
  json: () => Promise<unknown>;
};

/** The two public endpoints, kept as separate responses so 503 health is testable. */
function stubEndpoints(
  statusBody: unknown,
  healthBody: unknown,
  opts: { statusOk?: boolean; healthStatus?: number } = {},
) {
  vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
    const url = String(input);
    if (url.endsWith("/api/health")) {
      return Promise.resolve({
        ok: (opts.healthStatus ?? 200) < 400,
        status: opts.healthStatus ?? 200,
        json: () => Promise.resolve(healthBody),
      } satisfies MockResponse);
    }
    return Promise.resolve({
      ok: opts.statusOk ?? true,
      status: 200,
      json: () => Promise.resolve(statusBody),
    } satisfies MockResponse);
  });
}

/** /api/health is completely unreachable — e.g. a reverse proxy in front of it. */
function stubUnreadableHealth(statusBody: unknown) {
  vi.stubGlobal("fetch", (input: RequestInfo | URL) =>
    String(input).endsWith("/api/health")
      ? Promise.resolve({
          ok: false,
          status: 502,
          json: () => Promise.reject(new SyntaxError("bad gateway")),
        })
      : Promise.resolve({
          ok: true,
          status: 200,
          json: () => Promise.resolve(statusBody),
        }),
  );
}

const MAINS_STATUS = {
  appliance: { dry_run: false, engine_state: "idle", alarm: false, version: "4.1.0" },
  ups: [
    {
      id: "ups",
      name: "Rack UPS",
      reachable: true,
      manufacturer: "APC",
      model: "Smart-UPS 1500",
      power_source: "mains",
      battery_status: "normal",
      battery_charge_pct: 100,
      load_pct: 22,
      runtime_remaining_min: null,
      triggered: false,
    },
  ],
  hosts: [
    { name: "catacomb", type: "pve", enabled: true, credentials_ok: true, power_mgmt_ok: true },
    { name: "catacomb2", type: "pve", enabled: true, credentials_ok: true, power_mgmt_ok: true },
  ],
  events_summary: { INFO: 12, WARNING: 1, CRITICAL: 0 },
};

const MAINS_HEALTH = {
  status: "ok",
  version: "4.1.0",
  dry_run: false,
  ups_reachable: true,
  ups_reachable_count: 1,
  ups_total: 1,
  hosts_total: 2,
  hosts_ok: 2,
  hosts_selftest_ok: true,
};

describe("pve-ups definition", () => {
  it("has correct metadata", () => {
    expect(pveUpsDefinition.id).toBe("pve-ups");
    expect(pveUpsDefinition.name).toBe("PVE UPS");
    expect(pveUpsDefinition.icon).toBe("pve-ups");
    expect(pveUpsDefinition.category).toBe("monitoring");
    expect(pveUpsDefinition.defaultPollingMs).toBe(15_000);
  });

  it("has configFields defined", () => {
    expect(pveUpsDefinition.configFields).toHaveLength(2);
    expect(pveUpsDefinition.configFields[0].key).toBe("url");
    expect(pveUpsDefinition.configFields[0].type).toBe("url");
    expect(pveUpsDefinition.configFields[0].required).toBe(true);
    expect(pveUpsDefinition.configFields[1].key).toBe("upsId");
    expect(pveUpsDefinition.configFields[1].required).toBe(false);
  });

  describe("fetchData", () => {
    beforeEach(() => {
      vi.resetAllMocks();
    });

    afterEach(() => {
      vi.restoreAllMocks();
      vi.unstubAllGlobals();
    });

    it("returns healthy data on mains", async () => {
      stubEndpoints(MAINS_STATUS, MAINS_HEALTH);

      const result = await pveUpsDefinition.fetchData!({ url: "http://192.168.1.50:8080" });

      expect(result._status).toBe("ok");
      expect(result._statusText).toBeUndefined();
      expect(result.powerSource).toBe("mains");
      expect(result.loadPercent).toBe(22);
      expect(result.batteryCharge).toBe(100);
      // RFC 1628 leaves runtime undefined while on mains, so it must not read as 0.
      expect(result.runtimeMinutes).toBe(-1);
      expect(result.dryRun).toBe(false);
      expect(result.hostsOk).toBe(2);
      expect(result.hostsTotal).toBe(2);
      expect(result.eventCount).toBe(1);
      expect(result.version).toBe("4.1.0");
    });

    it("strips a trailing slash from the configured URL", async () => {
      const seen: string[] = [];
      vi.stubGlobal("fetch", (input: RequestInfo | URL) => {
        seen.push(String(input));
        return Promise.resolve({ ok: true, status: 200, json: () => Promise.resolve({}) });
      });

      await pveUpsDefinition.fetchData!({ url: "http://192.168.1.50:8080/" });

      expect(seen.every((u) => u.includes("192.168.1.50:8080/api/"))).toBe(true);
      expect(seen).toContain("http://192.168.1.50:8080/api/status");
      expect(seen).toContain("http://192.168.1.50:8080/api/health");
    });

    it("requires a URL", async () => {
      await expect(pveUpsDefinition.fetchData!({ url: "" })).rejects.toThrow("URL is required");
    });

    it("throws on a non-OK status response", async () => {
      stubEndpoints(MAINS_STATUS, MAINS_HEALTH, { statusOk: false });

      await expect(
        pveUpsDefinition.fetchData!({ url: "http://192.168.1.50:8080" }),
      ).rejects.toThrow("PVE-UPS error: 200");
    });

    it("still reads the monitoring counters from a 503 health response", async () => {
      // 503 on /api/health means the engine task is dead. The body still carries the
      // counters, so a dead engine must not read as "all targets failed their self-test".
      stubEndpoints(MAINS_STATUS, { ...MAINS_HEALTH, status: "degraded" }, { healthStatus: 503 });

      const result = await pveUpsDefinition.fetchData!({ url: "http://192.168.1.50:8080" });

      expect(result._status).toBe("ok");
      expect(result.hostsOk).toBe(2);
      expect(result.hostsTotal).toBe(2);
    });

    it("counts self-tests from /api/status when health is unreadable", async () => {
      stubUnreadableHealth(MAINS_STATUS);

      const result = await pveUpsDefinition.fetchData!({ url: "http://192.168.1.50:8080" });

      expect(result.hostsOk).toBe(2);
      expect(result._status).toBe("ok");
    });

    it("counts only enabled targets that passed both checks", async () => {
      stubUnreadableHealth({
        ...MAINS_STATUS,
        hosts: [
          { name: "a", enabled: true, credentials_ok: true, power_mgmt_ok: true },
          { name: "b", enabled: true, credentials_ok: true, power_mgmt_ok: false },
          { name: "c", enabled: false, credentials_ok: true, power_mgmt_ok: true },
        ],
      });

      const result = await pveUpsDefinition.fetchData!({ url: "http://192.168.1.50:8080" });

      expect(result.hostsOk).toBe(1);
      expect(result.hostsTotal).toBe(3);
      expect(result._status).toBe("ok");
    });

    it("warns while running on battery", async () => {
      stubEndpoints(
        {
          ...MAINS_STATUS,
          appliance: { ...MAINS_STATUS.appliance, engine_state: "on_battery" },
          ups: [
            {
              ...MAINS_STATUS.ups[0],
              power_source: "battery",
              runtime_remaining_min: 42,
            },
          ],
        },
        MAINS_HEALTH,
      );

      const result = await pveUpsDefinition.fetchData!({ url: "http://192.168.1.50:8080" });

      expect(result._status).toBe("warn");
      expect(result._statusText).toBe("Running on battery");
      expect(result.powerSource).toBe("battery");
      expect(result.runtimeMinutes).toBe(42);
    });

    it("errors on an unreachable UPS rather than reporting it as an outage", async () => {
      // PVE-UPS treats lost contact as an alarm, never as a confirmed outage.
      stubEndpoints(
        {
          ...MAINS_STATUS,
          ups: [{ ...MAINS_STATUS.ups[0], reachable: false, error: "SNMP timeout" }],
        },
        { ...MAINS_HEALTH, ups_reachable: false, ups_reachable_count: 0 },
      );

      const result = await pveUpsDefinition.fetchData!({ url: "http://192.168.1.50:8080" });

      expect(result._status).toBe("error");
      expect(result._statusText).toBe("A UPS is unreachable — alarm raised, no shutdown armed");
      expect(result.powerSource).toBe("unknown");
    });

    it("lets an active appliance alarm outrank the per-UPS rollup", async () => {
      stubEndpoints(
        { ...MAINS_STATUS, appliance: { ...MAINS_STATUS.appliance, alarm: true } },
        MAINS_HEALTH,
      );

      const result = await pveUpsDefinition.fetchData!({ url: "http://192.168.1.50:8080" });

      expect(result._status).toBe("error");
      expect(result._statusText).toBe("Appliance alarm is active");
    });

    it("warns when a shutdown target failed its self-test", async () => {
      stubEndpoints(MAINS_STATUS, { ...MAINS_HEALTH, hosts_ok: 1, hosts_selftest_ok: false });

      const result = await pveUpsDefinition.fetchData!({ url: "http://192.168.1.50:8080" });

      expect(result._status).toBe("warn");
      expect(result._statusText).toBe("1 shutdown target failed the last self-test");
    });

    it("warns on a low battery even on mains", async () => {
      stubEndpoints(
        {
          ...MAINS_STATUS,
          ups: [{ ...MAINS_STATUS.ups[0], battery_status: "low" }],
        },
        MAINS_HEALTH,
      );

      const result = await pveUpsDefinition.fetchData!({ url: "http://192.168.1.50:8080" });

      expect(result._status).toBe("warn");
      expect(result._statusText).toBe("UPS reports a low battery");
    });

    it("rolls up multiple UPS worst-case-wins", async () => {
      stubEndpoints(
        {
          ...MAINS_STATUS,
          ups: [
            {
              ...MAINS_STATUS.ups[0],
              id: "a",
              name: "Rack",
              load_pct: 10,
              battery_charge_pct: 100,
            },
            {
              ...MAINS_STATUS.ups[0],
              id: "b",
              name: "Office",
              power_source: "battery",
              battery_charge_pct: 40,
              load_pct: 30,
              runtime_remaining_min: 8,
              triggered: true,
              trigger_reason: "runtime below 10 min",
            },
          ],
        },
        { ...MAINS_HEALTH, ups_total: 2 },
      );

      const result = await pveUpsDefinition.fetchData!({ url: "http://192.168.1.50:8080" });

      expect(result._status).toBe("warn");
      expect(result.powerSource).toBe("battery");
      // mean load, floor charge, shortest runtime
      expect(result.loadPercent).toBe(20);
      expect(result.batteryCharge).toBe(40);
      expect(result.runtimeMinutes).toBe(8);
      expect(result.detail).toContain("Rack");
      expect(result.detail).toContain("On battery");
      expect(result.detail).toContain("triggered: runtime below 10 min");
    });

    it("selects a single UPS by id when configured", async () => {
      stubEndpoints(
        {
          ...MAINS_STATUS,
          ups: [
            { ...MAINS_STATUS.ups[0], id: "a", name: "Rack", load_pct: 10 },
            { ...MAINS_STATUS.ups[0], id: "b", name: "Office", load_pct: 90 },
          ],
        },
        { ...MAINS_HEALTH, ups_total: 2 },
      );

      const result = await pveUpsDefinition.fetchData!({
        url: "http://192.168.1.50:8080",
        upsId: "b",
      });

      expect(result.loadPercent).toBe(90);
      expect(result.detail).toBe("APC Smart-UPS 1500");
    });

    it("selects a single UPS by name when configured", async () => {
      stubEndpoints(
        {
          ...MAINS_STATUS,
          ups: [
            { ...MAINS_STATUS.ups[0], id: "a", name: "Rack", load_pct: 10 },
            { ...MAINS_STATUS.ups[0], id: "b", name: "Office", load_pct: 90 },
          ],
        },
        { ...MAINS_HEALTH, ups_total: 2 },
      );

      const result = await pveUpsDefinition.fetchData!({
        url: "http://192.168.1.50:8080",
        upsId: "Office",
      });

      expect(result.loadPercent).toBe(90);
    });

    it("throws a helpful error for an unknown UPS id", async () => {
      stubEndpoints(MAINS_STATUS, MAINS_HEALTH);

      await expect(
        pveUpsDefinition.fetchData!({ url: "http://192.168.1.50:8080", upsId: "nope" }),
      ).rejects.toThrow('No UPS matching "nope" — configured ids: ups');
    });

    it("summarises per-host state for the tooltip", async () => {
      stubEndpoints(
        {
          ...MAINS_STATUS,
          hosts: [
            { name: "catacomb", enabled: true, credentials_ok: true, power_mgmt_ok: true },
            {
              name: "catacomb3",
              enabled: true,
              credentials_ok: false,
              power_mgmt_ok: false,
              last_test_error: "token invalid",
            },
          ],
        },
        { ...MAINS_HEALTH, hosts_ok: 1, hosts_total: 2 },
      );

      const result = await pveUpsDefinition.fetchData!({ url: "http://192.168.1.50:8080" });

      expect(result.hostsDetail).toBe("catacomb (ok)\ncatacomb3 (self-test failed: token invalid)");
    });

    it("marks a disabled target as disabled rather than failed", async () => {
      stubEndpoints(
        {
          ...MAINS_STATUS,
          hosts: [
            { name: "catacomb", enabled: false, credentials_ok: false, power_mgmt_ok: false },
          ],
        },
        MAINS_HEALTH,
      );

      const result = await pveUpsDefinition.fetchData!({ url: "http://192.168.1.50:8080" });

      expect(result.hostsDetail).toBe("catacomb (disabled)");
    });

    it("handles an empty UPS list without throwing", async () => {
      stubEndpoints(
        { appliance: MAINS_STATUS.appliance, ups: [], hosts: [] },
        { ...MAINS_HEALTH, ups_total: 0, ups_reachable_count: 0, hosts_total: 0, hosts_ok: 0 },
      );

      const result = await pveUpsDefinition.fetchData!({ url: "http://192.168.1.50:8080" });

      expect(result.powerSource).toBe("unknown");
      expect(result.hostsTotal).toBe(0);
      expect(result.hostsOk).toBe(0);
      expect(result._status).toBe("ok");
    });

    it("defaults dryRun to true when the appliance does not report it", async () => {
      // Fail safe: an unconfigured appliance must not read as armed.
      stubEndpoints({ ups: [MAINS_STATUS.ups[0]] }, {});

      const result = await pveUpsDefinition.fetchData!({ url: "http://192.168.1.50:8080" });

      expect(result.dryRun).toBe(true);
    });
  });

  describe("toPayload", () => {
    const base = {
      powerSource: "mains",
      batteryStatus: "normal",
      loadPercent: 22,
      batteryCharge: 100,
      runtimeMinutes: 42,
      dryRun: false,
      hostsOk: 2,
      hostsTotal: 2,
      hostsDetail: "catacomb (ok)\ncatacomb2 (ok)",
      eventCount: 1,
      version: "4.1.0",
      detail: "APC Smart-UPS 1500",
    };

    it("builds the expected stats", () => {
      const payload = pveUpsDefinition.toPayload!(base);

      expect(payload.stats).toHaveLength(7);
      expect(payload.stats[0].value).toBe("Mains");
      expect(payload.stats[0].label).toBe("Power");
      expect(payload.stats[0].tooltip).toBe("APC Smart-UPS 1500");
      expect(payload.stats[1].value).toBe("22%");
      expect(payload.stats[2].value).toBe("100%");
      expect(payload.stats[3].value).toBe("42m");
      expect(payload.stats[4].value).toBe("Armed");
      expect(payload.stats[5].value).toBe("2/2");
      expect(payload.stats[6].value).toBe(1);
    });

    it("labels each power source", () => {
      const label = (powerSource: string) =>
        pveUpsDefinition.toPayload!({ ...base, powerSource }).stats[0].value;

      expect(label("battery")).toBe("On battery");
      expect(label("bypass")).toBe("Bypass");
      expect(label("none")).toBe("No output");
      expect(label("unknown")).toBe("Unknown");
    });

    it("formats the runtime", () => {
      const runtime = (runtimeMinutes: number) =>
        pveUpsDefinition.toPayload!({ ...base, runtimeMinutes }).stats[3].value;

      expect(runtime(-1)).toBe("—"); // undefined on mains
      expect(runtime(0)).toBe("<1m");
      expect(runtime(42)).toBe("42m");
      expect(runtime(60)).toBe("1h");
      expect(runtime(125)).toBe("2h 5m");
      expect(runtime(121)).toBe("2h 1m");
    });

    it("shows the low battery state in the tooltip", () => {
      const payload = pveUpsDefinition.toPayload!({ ...base, batteryStatus: "low" });
      expect(payload.stats[2].tooltip).toBe("Low");
    });

    it("flags dry run and marks the mode stat amber", () => {
      const payload = pveUpsDefinition.toPayload!({ ...base, dryRun: true });
      expect(payload.stats[4].value).toBe("Dry run");
      expect(payload.stats[4].valueClassName).toBe("text-amber-500");
      expect(payload.stats[4].tooltip).toContain("nothing will be shut down");
    });

    it("shows a dash when no targets are configured", () => {
      const payload = pveUpsDefinition.toPayload!({
        ...base,
        hostsOk: 0,
        hostsTotal: 0,
        hostsDetail: "",
      });
      expect(payload.stats[5].value).toBe("—");
    });

    it("defaults to four stats and surfaces the version in the events tooltip", () => {
      const payload = pveUpsDefinition.toPayload!(base);
      expect(payload.defaultActiveIds).toEqual(["status", "load", "battery", "runtime"]);
      expect(payload.stats[6].tooltip).toBe("Warnings and errors in the last 48h (v4.1.0)");
    });
  });
});
