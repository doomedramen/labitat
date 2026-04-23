import { getSession } from "@/lib/auth";
import { Dashboard } from "@/components/dashboard";
import { serverCache } from "@/lib/server-cache";
import { getOrSeedGroups, getOrSeedSetting } from "@/lib/structural-cache";
import { runStartupWarmup } from "@/lib/startup";
import type { GroupWithCache, ItemWithCache } from "@/lib/types";

// This page is always dynamic due to session auth, database queries, and cookie usage
export const dynamic = "force-dynamic";

// Module-level flag to track startup warmup
let warmupTriggered = false;

async function DashboardContent() {
  // Trigger startup warmup on first load (fire and forget)
  if (!warmupTriggered) {
    warmupTriggered = true;
    runStartupWarmup();
  }
  let session, groupsWithItems, titleSetting;
  try {
    [session, groupsWithItems, titleSetting] = await Promise.all([
      getSession(),
      getOrSeedGroups(),
      getOrSeedSetting("dashboardTitle"),
    ]);
  } catch (err) {
    console.error("[labitat] Failed to load dashboard data:", err);
    throw err;
  }

  // Read from server cache — include stale data for immediate rendering
  const now = Date.now();
  const allCache = new Map(serverCache.getAll());

  const enrichedGroups: GroupWithCache[] = groupsWithItems.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const cached = allCache.get(item.id) ?? null;
      const age = cached ? now - cached.lastFetchedAt : null;
      return {
        ...item,
        cachedWidgetData: cached?.widgetData ?? null,
        cachedPingStatus: cached?.pingStatus ?? null,
        cachedDataAge: age,
      } as ItemWithCache;
    }),
  }));

  const isLoggedIn = !!session.loggedIn;
  const dashboardTitle = titleSetting?.value ?? "Labitat";

  return <Dashboard groups={enrichedGroups} isLoggedIn={isLoggedIn} title={dashboardTitle} />;
}

export default DashboardContent;
