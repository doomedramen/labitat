import { getSession } from "@/lib/auth";
import { Dashboard } from "@/components/dashboard/dashboard";
import { serverCache } from "@/lib/server-cache";
import { getOrSeedGroups, getOrSeedSetting } from "@/lib/structural-cache";
import type { GroupWithCache, ItemWithCache } from "@/lib/types";

// This page is always dynamic due to session auth, database queries, and cookie usage
export const dynamic = "force-dynamic";

async function DashboardContent() {
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

  // Read from server cache — only use data fresh enough for SSR.
  const freshCache = new Map(serverCache.getAllFresh());

  const enrichedGroups: GroupWithCache[] = groupsWithItems.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const cached = freshCache.get(item.id) ?? null;
      return {
        ...item,
        cachedWidgetData: cached?.widgetData ?? null,
        cachedPingStatus: cached?.pingStatus ?? null,
      } as ItemWithCache;
    }),
  }));

  const isLoggedIn = !!session.loggedIn;
  const dashboardTitle = titleSetting?.value ?? "Labitat";

  return <Dashboard groups={enrichedGroups} isLoggedIn={isLoggedIn} title={dashboardTitle} />;
}

export default DashboardContent;
