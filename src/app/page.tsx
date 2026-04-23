import { getSession } from "@/lib/auth";
import { serverCache } from "@/lib/server-cache";
import { getOrSeedGroups, getOrSeedSetting } from "@/lib/structural-cache";
import { runStartupWarmup } from "@/lib/startup";
import type { GroupWithCache, ItemWithCache } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { ItemLive } from "@/lib/live-types";
import { LiveProvider } from "@/components/dashboard/live-provider";
import { DashboardClient } from "@/components/dashboard/dashboard-client";

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

  const itemIds = groupsWithItems.flatMap((g) => g.items.map((i) => i.id));
  const uniqueItemIds = [...new Set(itemIds)];
  const snapshotKey = uniqueItemIds.sort().join(",");

  const allCache = new Map(serverCache.getAll());
  const initialSnapshotById: Record<string, ItemLive> = {};
  for (const id of uniqueItemIds) {
    const cached = allCache.get(id) ?? null;
    initialSnapshotById[id] = {
      widgetData: cached?.widgetData ?? null,
      pingStatus: cached?.pingStatus ?? null,
      lastFetchedAt: cached?.lastFetchedAt ? cached.lastFetchedAt : null,
      itemLastUpdateAt: null,
    };
  }

  const groupsForView: GroupWithCache[] = groupsWithItems.map((group) => ({
    ...group,
    items: group.items.map(
      (item) =>
        ({
          ...item,
          cachedWidgetData: null,
          cachedPingStatus: null,
          cachedDataAge: null,
        }) as ItemWithCache,
    ),
  }));

  const isLoggedIn = !!session.loggedIn;
  const dashboardTitle = titleSetting?.value ?? "Labitat";

  return (
    <div className={cn("min-h-svh p-6")}>
      <LiveProvider
        initialSnapshotById={initialSnapshotById}
        snapshotKey={snapshotKey}
        enableSse={true}
      >
        <DashboardClient groups={groupsForView} isLoggedIn={isLoggedIn} title={dashboardTitle} />
      </LiveProvider>
    </div>
  );
}

export default DashboardContent;
