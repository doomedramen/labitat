import { expect, it } from "vitest";
import { stalenessFloor } from "./live-store";
import { serviceHealth } from "./service-health";
import type { ItemLive } from "./live-types";
import type { ItemRow } from "./types";

const item = { id: "a", serviceType: "radarr", pollingMs: 10_000 } as ItemRow;
const observedAt = 1_000_000;
const live: ItemLive = {
  widgetData: { _status: "ok" },
  pingStatus: null,
  configurationRevision: 0,
  observationUpdatedAt: observedAt,
  lastAttemptAt: observedAt,
  lastSuccessAt: observedAt,
  freshness: "fresh",
  lastFetchedAt: observedAt,
  itemLastUpdateAt: observedAt,
};
const tenMinutes = 600_000;

it("calls old data stale once a live connection has had time to refresh it", () => {
  expect(serviceHealth(item, live, observedAt + tenMinutes).stale).toBe(true);
});

it("does not call data stale while live updates are paused or still opening", () => {
  for (const sseState of ["paused", "connecting"] as const) {
    const floor = stalenessFloor({ sseState, lastUpdateAt: null, liveSince: null });
    expect(serviceHealth(item, live, observedAt + tenMinutes, false, floor).stale).toBe(false);
  }
});

it("gives a resumed connection one refresh window before judging age", () => {
  const liveSince = observedAt + tenMinutes;
  const floor = stalenessFloor({ sseState: "connected", lastUpdateAt: null, liveSince });
  expect(serviceHealth(item, live, liveSince + 5_000, false, floor).stale).toBe(false);
  expect(serviceHealth(item, live, liveSince + 31_000, false, floor).stale).toBe(true);
});

it("still reports a failed poll as stale while paused", () => {
  const failed = { ...live, freshness: "stale" as const };
  expect(serviceHealth(item, failed, observedAt, false, Infinity).stale).toBe(true);
});
