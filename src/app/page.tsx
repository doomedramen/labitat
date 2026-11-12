import { hasEditAccess } from "@/lib/auth/guard";
import { serverCache } from "@/lib/server-cache";
import { getOrSeedSetting } from "@/lib/structural-cache";
import { readDashboardLayout } from "@/lib/dashboard-layout";
import { OperatorDashboard } from "@/components/operator/operator-dashboard";
import type { ItemLive } from "@/lib/live-types";
import { LiveProvider } from "@/components/dashboard/live-provider";
// This page is always dynamic due to session auth, database queries, and cookie usage
export const dynamic = "force-dynamic";
export const revalidate = 0;

async function DashboardContent() {
  let canEdit, layout, titleSetting;
  try {
    [canEdit, layout, titleSetting] = await Promise.all([
      hasEditAccess(),
      Promise.resolve(readDashboardLayout()),
      getOrSeedSetting("dashboardTitle"),
    ]);
  } catch (err) {
    console.error("[labitat] Failed to load dashboard data:", err);
    throw err;
  }

  const groupsWithItems = layout.groups;
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
    const saved = allCache.get(id) ?? null;
    const item = groupsWithItems
      .flatMap((group) => group.items)
      .find((candidate) => candidate.id === id);
    const cached =
      saved?.configurationRevision == null ||
      saved.configurationRevision === item?.configurationRevision
        ? saved
        : null;
    initialSnapshotById[id] = {
      widgetData: cached?.widgetData ?? null,
      pingStatus: cached?.pingStatus ?? null,
      configurationRevision: item?.configurationRevision ?? 0,
      observationUpdatedAt: cached?.lastFetchedAt ?? null,
      lastAttemptAt: cached?.lastAttemptAt ?? null,
      lastSuccessAt: cached?.lastSuccessAt ?? null,
      freshness: cached?.freshness ?? "unknown",
      lastFetchedAt: cached?.lastFetchedAt ?? null,
      itemLastUpdateAt: null,
    };
  }

  const dashboardTitle = titleSetting?.value ?? "Labitat";

  return (
    <LiveProvider initialSnapshotById={initialSnapshotById} snapshotKey={snapshotKey} enableSse>
      <OperatorDashboard
        groups={groupsWithItems}
        revision={layout.revision}
        title={dashboardTitle}
        canEdit={canEdit}
        initialSnapshotById={initialSnapshotById}
        serverNow={Date.now()}
      />
    </LiveProvider>
  );
}

export default DashboardContent;
