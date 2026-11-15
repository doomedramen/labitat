import fs from "node:fs";
import path from "node:path";

let cached: string | undefined;

/**
 * The running server's build. Pages render with it and the live-update stream repeats
 * it, so a tab left open across a redeploy can tell it is running old code: its Server
 * Actions would otherwise fail with "Failed to find Server Action".
 */
export function currentBuildId(): string {
  if (cached) return cached;
  if (process.env.NODE_ENV !== "production") return (cached = "development");
  try {
    cached =
      process.env.NEXT_DEPLOYMENT_ID ||
      fs.readFileSync(path.join(process.cwd(), ".next", "BUILD_ID"), "utf8").trim();
  } catch {
    cached = "unknown";
  }
  return cached;
}
