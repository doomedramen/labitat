import { z } from "zod";
import type { ServiceData, ServiceStatus } from "@/lib/adapters/types";

// Strictly JSON-serializable: no Dates, Maps, Sets, or class instances.
export type ItemLive = {
  widgetData: ServiceData | null;
  pingStatus: ServiceStatus | null;
  /** Non-secret item configuration generation that produced this observation. */
  configurationRevision: number | null;
  /** Server timestamp for the latest observation or health-state change. */
  observationUpdatedAt: number | null;
  /** Start time of the latest actual poll attempt, if known. */
  lastAttemptAt: number | null;
  /** Start time of the latest poll that acquired fresh useful data, if known. */
  lastSuccessAt: number | null;
  /** Freshness provenance is independent from service health severity. */
  freshness: "fresh" | "stale" | "unknown";
  /** ms since epoch from server; null = never fetched */
  lastFetchedAt: number | null;
  /** ms since epoch from server; null = no live update received yet */
  itemLastUpdateAt: number | null;
};

export type PollState = "unknown" | "scheduled" | "queued" | "polling" | "paused";

export type PollSchedule = {
  itemId: string;
  configurationRevision: number | null;
  serverNow: number | null;
  pollState: PollState;
  nextPollAt: number | null;
  effectiveIntervalMs: number | null;
};

const serviceDataSchema: z.ZodType<ServiceData> = z.record(z.string(), z.unknown());

const serviceStatusSchema: z.ZodType<ServiceStatus> = z.discriminatedUnion("state", [
  z.object({ state: z.literal("unknown") }),
  z.object({ state: z.literal("healthy"), latencyMs: z.number().optional() }),
  z.object({ state: z.literal("degraded"), reason: z.string().optional() }),
  z.object({ state: z.literal("reachable") }),
  z.object({ state: z.literal("unreachable"), reason: z.string() }),
  z.object({ state: z.literal("slow"), reason: z.string(), timeoutMs: z.number() }),
  z.object({ state: z.literal("error"), reason: z.string(), httpStatus: z.number().optional() }),
]);

export const sseEventSchema = z.union([
  z.object({
    type: z.literal("reconnect"),
  }),
  z.object({
    type: z.literal("update"),
    itemId: z.string(),
    widgetData: serviceDataSchema.nullable(),
    pingStatus: serviceStatusSchema.nullable(),
    fetchedAt: z.number(),
    configurationRevision: z.number().int().nullable().optional(),
    observationUpdatedAt: z.number().nullable().optional(),
    lastAttemptAt: z.number().nullable().optional(),
    lastSuccessAt: z.number().nullable().optional(),
    freshness: z.enum(["fresh", "stale", "unknown"]).optional(),
  }),
  z.object({
    type: z.literal("poll-state"),
    itemId: z.string(),
    configurationRevision: z.number().int().nullable(),
    serverNow: z.number().nullable(),
    pollState: z.enum(["unknown", "scheduled", "queued", "polling", "paused"]),
    nextPollAt: z.number().nullable(),
    effectiveIntervalMs: z.number().nullable(),
  }),
]);
