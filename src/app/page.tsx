import { Suspense } from "react"
import { getSession } from "@/lib/auth"
import { Dashboard } from "@/components/dashboard/dashboard"
import { DashboardSkeleton } from "@/components/dashboard/skeleton"
import { preloadAllDatapoints } from "@/actions/widget-data"
import { pingAndCache } from "@/actions/ping"
import { getOrSeedGroups, getOrSeedSetting } from "@/lib/structural-cache"
import type { GroupWithCache, ItemWithCache } from "@/lib/types"

async function DashboardContent() {
  let session, groupsWithItems, titleSetting
  try {
    ;[session, groupsWithItems, titleSetting] = await Promise.all([
      getSession(),
      getOrSeedGroups(),
      getOrSeedSetting("dashboardTitle"),
    ])
  } catch (err) {
    console.error("[labitat] Failed to load dashboard data:", err)
    throw err
  }

  const allItems = groupsWithItems.flatMap((g) => g.items)
  const datapoints = await preloadAllDatapoints(allItems.map((i) => i.id))

  const enrichedGroups: GroupWithCache[] = groupsWithItems.map((group) => ({
    ...group,
    items: group.items.map((item) => {
      const dp = datapoints[item.id]
      return {
        ...item,
        cachedWidgetData: dp?.widgetData ?? null,
        cachedPingStatus: dp?.pingStatus ?? null,
      } as ItemWithCache
    }),
  }))

  const pingItems = allItems.filter((item) => !item.serviceType && item.href)
  if (pingItems.length > 0) {
    Promise.all(
      pingItems.map((item) => pingAndCache(item.id, item.href!))
    ).catch((err) => console.error("[labitat] Background ping failed:", err))
  }

  return (
    <Dashboard
      groups={enrichedGroups}
      isLoggedIn={!!session.loggedIn}
      title={titleSetting?.value ?? "Labitat"}
    />
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
