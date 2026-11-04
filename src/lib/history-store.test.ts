import { beforeEach, afterEach, describe, expect, it, vi } from "vitest";
import type { TestDb } from "../../tests/helpers/test-database";
const state = vi.hoisted(() => ({ db: null as TestDb | null }));
vi.mock("@/lib/db", () => ({
  db: new Proxy({}, { get: (_, key) => Reflect.get(state.db!, key) }),
}));
import { testDatabase } from "../../tests/helpers/test-database";
import { recordHistory, readHistory } from "./history-store";
import { groups, items, metricHistory, healthHistory } from "./db/schema";
let sqlite: ReturnType<typeof testDatabase>["sqlite"];
const now = Date.UTC(2026, 10, 4, 12);
beforeEach(() => {
  ({ db: state.db, sqlite } = testDatabase());
  vi.useFakeTimers();
  vi.setSystemTime(now);
  state.db!.insert(groups).values({ id: "g", name: "System", order: 0 }).run();
  state
    .db!.insert(items)
    .values({
      id: "a",
      groupId: "g",
      label: "Host",
      order: 0,
      serviceType: "glances",
      configurationRevision: 1,
    })
    .run();
});
afterEach(() => {
  sqlite.close();
  vi.useRealTimers();
});
describe("persistent observation history", () => {
  it("samples once a minute, retains zero, and records repeated failures only once", () => {
    recordHistory(
      "a",
      1,
      now,
      { _status: "ok", cpuPercent: 0, memPercent: 40, swapPercent: 0, load1: 1 },
      null,
      true,
    );
    recordHistory("a", 1, now + 1000, { _status: "ok", cpuPercent: 80 }, null, true);
    recordHistory(
      "a",
      1,
      now + 2000,
      { _status: "warn", _statusText: "Offline", cpuPercent: 0 },
      null,
      false,
    );
    recordHistory(
      "a",
      1,
      now + 3000,
      { _status: "warn", _statusText: "Offline", cpuPercent: 0 },
      null,
      false,
    );
    expect(state.db!.select().from(metricHistory).all()).toHaveLength(1);
    expect(state.db!.select().from(healthHistory).all()).toHaveLength(2);
    expect(readHistory("a", "cpu", "1h", now)!.points.at(-1)!.value).toBe(0);
  });
  it("leaves gaps, bounds the result and fences changed configurations", () => {
    recordHistory("a", 1, now - 120000, { _status: "ok", cpuPercent: 20 }, null, true);
    const result = readHistory("a", "cpu", "24h", now)!;
    expect(result.points).toHaveLength(1440);
    expect(result.points.at(-1)!.value).toBeNull();
    sqlite.prepare("UPDATE items SET configuration_revision = 2 WHERE id = ?").run("a");
    recordHistory("a", 1, now, { cpuPercent: 88 }, null, true);
    expect(readHistory("a", "cpu", "1h", now)!.points.every((p) => p.value === null)).toBe(true);
  });
  it("stores selected extras but not unused metrics or credentials", () => {
    sqlite
      .prepare("UPDATE items SET stat_card_order = ? WHERE id = ?")
      .run(JSON.stringify({ active: ["cpu"], unused: ["memory"] }), "a");
    recordHistory(
      "a",
      1,
      now,
      { cpuPercent: 20, memPercent: 80, apiKey: "never-store-this" },
      null,
      true,
    );
    const row = state.db!.select().from(metricHistory).get()!;
    expect(row.values).toEqual({ cpu: { value: 20, unit: "percent" } });
    expect(JSON.stringify(row)).not.toContain("never-store-this");
  });
});
it("retains 24 hours, partitions units and reloads persisted samples after a restart", async () => {
  const older = now - 86_460_000;
  recordHistory("a", 1, older, { cpuPercent: 7 }, null, true);
  recordHistory(
    "a",
    1,
    now - 120000,
    { cpuPercent: 8, _numeric: { cpu: { value: 8, unit: "count" } } },
    null,
    true,
  );
  recordHistory("a", 1, now, { cpuPercent: 0 }, null, true);
  vi.resetModules();
  const reloaded = (await import("./history-store")).readHistory("a", "cpu", "24h", now)!;
  expect(reloaded.unit).toBe("percent");
  expect(reloaded.points.at(-1)?.value).toBe(0);
  expect(reloaded.points.at(-3)?.value).toBeNull();
  expect(reloaded.points.some((point) => point.timestamp === older)).toBe(false);
});
it("records explicitly selected numeric metrics after the fourth slot", () => {
  sqlite
    .prepare("UPDATE items SET stat_card_order = ? WHERE id = ?")
    .run(JSON.stringify({ active: ["cpu", "memory", "swap", "load", "uptime"], unused: [] }), "a");
  recordHistory(
    "a",
    1,
    now,
    {
      cpuPercent: 1,
      memPercent: 2,
      swapPercent: 0,
      load1: 1.1,
      uptime: "5 minutes",
      _numeric: { uptime: { value: 300, unit: "seconds" } },
    },
    null,
    true,
  );
  expect(readHistory("a", "uptime", "1h", now)!.points.at(-1)?.value).toBe(300);
});
it("keeps warning health even when a transport ping is healthy", () => {
  recordHistory(
    "a",
    1,
    now,
    { _status: "warn", _statusText: "CPU temperature high", cpuPercent: 91 },
    { state: "healthy" },
    true,
  );
  expect(readHistory("a", "cpu", "1h", now)!.transitions[0]).toMatchObject({
    state: "degraded",
    reason: "CPU temperature high",
  });
});
