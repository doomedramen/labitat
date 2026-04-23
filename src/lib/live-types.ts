import { z } from "zod";
import type { ServiceData, ServiceStatus } from "@/lib/adapters/types";

// Strictly JSON-serializable: no Dates, Maps, Sets, or class instances.
export type ItemLive = {
  widgetData: ServiceData | null;
  pingStatus: ServiceStatus | null;
  /** ms since epoch from server; null = never fetched */
  lastFetchedAt: number | null;
  /** ms since epoch from server; null = no live update received yet */
  itemLastUpdateAt: number | null;
};

const serviceDataSchema: z.ZodType<ServiceData> = z.record(z.unknown());

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
  }),
]);
