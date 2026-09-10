import type { ServiceData, ServiceStatus } from "@/lib/adapters/types";

export const LIVE_FIXTURE_ITEM_ID = "fixture-item-1";
export const LIVE_FIXTURE_CONFIGURATION_REVISION = 7;

export type ObservationFixture = {
  itemId: string;
  configurationRevision: number | null;
  widgetData: ServiceData | null;
  pingStatus: ServiceStatus | null;
  observationUpdatedAt: number | null;
  lastAttemptAt: number | null;
  lastSuccessAt: number | null;
  freshness: "fresh" | "stale" | "unknown";
};

export type PollScheduleFixture = {
  itemId: string;
  configurationRevision: number | null;
  serverNow: number | null;
  pollState: "unknown" | "scheduled" | "queued" | "polling" | "paused";
  nextPollAt: number | null;
  effectiveIntervalMs: number | null;
};

const successfulAt = 1_700_000_000_000;

export const liveObservationFixtures = {
  successful: {
    itemId: LIVE_FIXTURE_ITEM_ID,
    configurationRevision: LIVE_FIXTURE_CONFIGURATION_REVISION,
    widgetData: { _status: "ok", value: "fresh-value" },
    pingStatus: { state: "healthy" },
    observationUpdatedAt: successfulAt,
    lastAttemptAt: successfulAt,
    lastSuccessAt: successfulAt,
    freshness: "fresh",
  } satisfies ObservationFixture,

  failedAfterSuccess: {
    itemId: LIVE_FIXTURE_ITEM_ID,
    configurationRevision: LIVE_FIXTURE_CONFIGURATION_REVISION,
    widgetData: { _status: "error", _statusText: "Request failed", value: "fresh-value" },
    pingStatus: { state: "unreachable", reason: "Request failed" },
    observationUpdatedAt: successfulAt + 30_000,
    lastAttemptAt: successfulAt + 30_000,
    lastSuccessAt: successfulAt,
    freshness: "stale",
  } satisfies ObservationFixture,

  freshDegraded: {
    itemId: LIVE_FIXTURE_ITEM_ID,
    configurationRevision: LIVE_FIXTURE_CONFIGURATION_REVISION,
    widgetData: { _status: "warn", _statusText: "One dependency is slow", value: "new-value" },
    pingStatus: { state: "degraded", reason: "One dependency is slow" },
    observationUpdatedAt: successfulAt + 60_000,
    lastAttemptAt: successfulAt + 60_000,
    lastSuccessAt: successfulAt + 60_000,
    freshness: "fresh",
  } satisfies ObservationFixture,

  legacyCache: {
    itemId: LIVE_FIXTURE_ITEM_ID,
    configurationRevision: null,
    widgetData: { _status: "ok", value: "legacy-value" },
    pingStatus: null,
    observationUpdatedAt: successfulAt,
    lastAttemptAt: null,
    lastSuccessAt: null,
    freshness: "unknown",
  } satisfies ObservationFixture,
} as const;

export const pollScheduleFixtures = {
  queued: {
    itemId: LIVE_FIXTURE_ITEM_ID,
    configurationRevision: LIVE_FIXTURE_CONFIGURATION_REVISION,
    serverNow: successfulAt + 90_000,
    pollState: "queued",
    nextPollAt: successfulAt + 90_000,
    effectiveIntervalMs: 30_000,
  } satisfies PollScheduleFixture,

  slow: {
    itemId: LIVE_FIXTURE_ITEM_ID,
    configurationRevision: LIVE_FIXTURE_CONFIGURATION_REVISION,
    serverNow: successfulAt + 120_000,
    pollState: "polling",
    nextPollAt: null,
    effectiveIntervalMs: 30_000,
  } satisfies PollScheduleFixture,
} as const;

export const mockObservationDelayMs = 250;
