import { initializeLayoutState } from "./dashboard-layout";
import { pruneHistory, pruneHistoryIfDue } from "./history-store";
import { pollingSup } from "./polling-supervisor";
const runtime = globalThis as typeof globalThis & { __labitatOperatorStarted?: boolean };
export function startOperatorRuntime() {
  if (runtime.__labitatOperatorStarted) return;
  try {
    initializeLayoutState();
    pruneHistory();
    runtime.__labitatOperatorStarted = true;
    pollingSup.startBackground(pruneHistoryIfDue);
  } catch {
    console.warn("[startup] Dashboard migrations are required before background history can start");
  }
}
