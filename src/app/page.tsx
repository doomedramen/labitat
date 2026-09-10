import { hasEditAccess } from "@/lib/auth/guard";
import { serverCache } from "@/lib/server-cache";
import { getOrSeedGroups, getOrSeedSetting } from "@/lib/structural-cache";
import { runStartupWarmup } from "@/lib/startup";
import { cn } from "@/lib/utils";
import type { ItemLive } from "@/lib/live-types";
import { LiveProvider } from "@/components/dashboard/live-provider";
import { DashboardViewChrome } from "@/components/dashboard/dashboard-view-chrome";
import { GroupCard } from "@/components/dashboard/group";
import { EmptyDashboard } from "@/components/dashboard/empty-dashboard";
import { unstable_noStore as noStore } from "next/cache";

// This page is always dynamic due to session auth, database queries, and cookie usage
export const dynamic = "force-dynamic";
export const revalidate = 0;

// Module-level flag to track startup warmup
let warmupTriggered = false;

async function DashboardContent() {
  // Ensure Next never serves a cached RSC response for this route.
  noStore();
  // Trigger startup warmup on first load (fire and forget)
  if (!warmupTriggered) {
    warmupTriggered = true;
    runStartupWarmup();
  }
  let canEdit, groupsWithItems, titleSetting;
  try {
    [canEdit, groupsWithItems, titleSetting] = await Promise.all([
      hasEditAccess(),
      getOrSeedGroups(),
      getOrSeedSetting("dashboardTitle"),
    ]);
  } catch (err) {
    console.error("[labitat] Failed to load dashboard data:", err);
    throw err;
  }

  const itemIds = groupsWithItems.flatMap((g) => g.items.map((i) => i.id));
  const uniqueItemIds = [...new Set(itemIds)];
  const snapshotKey = groupsWithItems
    .flatMap((group) => group.items)
    .map((item) => `${item.id}:${item.configurationRevision ?? 0}`)
    .sort()
    .join(",");

  // Reload from DB so SSR snapshots reflect the latest persisted cache even if the
  // request is served by a different server instance than the writer.
  const allCache = new Map(serverCache.getAllReloaded());
  const initialSnapshotById: Record<string, ItemLive> = {};
  for (const id of uniqueItemIds) {
    const cached = allCache.get(id) ?? null;
    const item = groupsWithItems
      .flatMap((group) => group.items)
      .find((candidate) => candidate.id === id);
    initialSnapshotById[id] = {
      widgetData: cached?.widgetData ?? null,
      pingStatus: cached?.pingStatus ?? null,
      configurationRevision: item?.configurationRevision ?? 0,
      observationUpdatedAt: cached?.lastFetchedAt ?? null,
      lastAttemptAt: null,
      lastSuccessAt: null,
      freshness: "unknown",
      lastFetchedAt: cached?.lastFetchedAt ?? null,
      itemLastUpdateAt: null,
    };
  }

  const dashboardTitle = titleSetting?.value ?? "Labitat";

  return (
    <main className={cn("min-h-svh px-4 pt-5 pb-10 sm:px-6 sm:pt-7 lg:px-8")}>
      <LiveProvider
        initialSnapshotById={initialSnapshotById}
        snapshotKey={snapshotKey}
        enableSse={true}
      >
        <DashboardViewChrome canEdit={canEdit} title={dashboardTitle}>
          {groupsWithItems.length > 0 ? (
            <div className="flex flex-col gap-10 sm:gap-12">
              {groupsWithItems.map((group) => (
                <GroupCard key={group.id} group={group} />
              ))}
            </div>
          ) : (
            <EmptyDashboard canEdit={canEdit} />
          )}
        </DashboardViewChrome>
      </LiveProvider>
    </main>
  );
}

export default DashboardContent;
