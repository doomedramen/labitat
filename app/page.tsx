import { Suspense } from "react"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { Dashboard } from "@/components/dashboard/dashboard"
import { DashboardSkeleton } from "@/components/dashboard/skeleton"
import { preloadAllDatapoints } from "@/actions/widget-data"
import { pingAndCache } from "@/actions/ping"

// Revalidate every 30 seconds - balances freshness with server load
// Client-side SWR polling handles real-time widget updates
export const revalidate = 30

async function DashboardContent() {
  let session, groupsWithItems, titleSetting
  try {
    ;[session, groupsWithItems, titleSetting] = await Promise.all([
      getSession(),
      db.query.groups.findMany({
        orderBy: (g, { asc }) => [asc(g.order)],
        with: {
          items: {
            orderBy: (i, { asc }) => [asc(i.order)],
          },
        },
      }),
      db.query.settings.findFirst({
        where: eq(settings.key, "dashboardTitle"),
      }),
    ])
  } catch (err) {
    console.error("[labitat] Failed to load dashboard data:", err)
    throw err
  }

  // Preload cached datapoints for all items (fast, no network requests)
  const allItems = groupsWithItems.flatMap((g) => g.items)
  const itemIds = allItems.map((i) => i.id)

  const datapoints = await preloadAllDatapoints(itemIds)

  // Refresh ping statuses in background for items without serviceType
  // Don't await - these are fire-and-forget for next SSR
  const pingItems = allItems.filter((item) => !item.serviceType && item.href)
  if (pingItems.length > 0) {
    Promise.all(
      pingItems.map((item) => pingAndCache(item.id, item.href!))
    ).catch((err) => console.error("[labitat] Background ping failed:", err))
  }

  return (
    <Dashboard
      groups={groupsWithItems}
      initialDatapoints={datapoints}
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
