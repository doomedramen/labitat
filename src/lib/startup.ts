import { pollingSup } from "./polling-supervisor";
import { env } from "./env";

let startupComplete = false;

/**
 * Run startup warmup sequence.
 *
 * This is called on the first page load to trigger an immediate poll
 * of all services, ensuring fresh data is available right away.
 */
export async function runStartupWarmup(): Promise<void> {
  if (startupComplete || !env.STARTUP_WARMUP_ENABLED) {
    return;
  }

  startupComplete = true;
  console.log("[startup] Triggering data warmup...");

  // Fire and forget - don't block server startup
  pollingSup
    .pollNow()
    .then(() => console.log("[startup] Warmup complete"))
    .catch((err) => console.error("[startup] Warmup failed:", err));
}
