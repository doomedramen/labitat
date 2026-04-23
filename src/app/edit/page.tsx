import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";
import { serverCache } from "@/lib/server-cache";
import { getOrSeedGroups, getOrSeedSetting } from "@/lib/structural-cache";
import type { GroupWithCache, ItemWithCache } from "@/lib/types";
import { cn } from "@/lib/utils";
import { LiveProvider } from "@/components/dashboard/live-provider";
import { DashboardClient } from "@/components/dashboard/dashboard-client";
import type { ItemLive } from "@/lib/live-types";

export const dynamic = "force-dynamic";

export default async function EditPage() {
  const [session, groupsWithItems, titleSetting] = await Promise.all([
    getSession(),
    getOrSeedGroups(),
    getOrSeedSetting("dashboardTitle"),
  ]);

  if (!session.loggedIn) redirect("/");

  if (process.env.NODE_ENV === "test") {
    const first = groupsWithItems[0]?.items[0];
    // eslint-disable-next-line no-console
    console.log("[edit/page] firstItem.statCardOrder:", first?.id, first?.statCardOrder);
  }

  const itemIds = groupsWithItems.flatMap((g) => g.items.map((i) => i.id));
  const uniqueItemIds = [...new Set(itemIds)];

  const snapshotKey = uniqueItemIds.sort().join(",");

  // Reload from DB so SSR snapshots reflect the latest persisted cache even if the
  // request is served by a different server instance than the writer.
  const allCache = new Map(serverCache.getAllReloaded());
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

  const now = Date.now();
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

  const dashboardTitle = titleSetting?.value ?? "Labitat";

  return (
    <div className={cn("min-h-svh p-6")}>
      <LiveProvider
        initialSnapshotById={initialSnapshotById}
        snapshotKey={snapshotKey}
        enableSse={false}
      >
        <DashboardClient groups={enrichedGroups} isLoggedIn title={dashboardTitle} />
      </LiveProvider>
    </div>
  );
}
