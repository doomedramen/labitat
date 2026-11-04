import type { MetricUnit, NumericObservation } from "./service-presentation";
export type HistoryValues = Record<string, NumericObservation>;
export type HistoryRange = "1h" | "6h" | "24h";
export const HISTORY_RANGES: Record<HistoryRange, number> = { "1h": 60, "6h": 360, "24h": 1440 };
export type HistoryResponse = {
  metric: string | null;
  unit: MetricUnit | null;
  points: { timestamp: number; value: number | null }[];
  transitions: { timestamp: number; state: string; reason: string | null }[];
};
