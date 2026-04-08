import { Suspense } from "react"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { Dashboard } from "@/components/dashboard/dashboard"
import { DashboardSkeleton } from "@/components/dashboard/skeleton"
import { SWRFallbackProvider } from "@/components/swr-fallback-provider"
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

  // Load last-known datapoints for all items from the server-side cache
  const allItems = groupsWithItems.flatMap((g) => g.items)
  const datapoints = await preloadAllDatapoints(allItems.map((i) => i.id))

  // Build SWR fallback map so widgets render with cached data on first paint
  const swrFallback: Record<string, unknown> = {}
  for (const item of allItems) {
    const dp = datapoints[item.id]
    if (dp?.widgetData) swrFallback[`widget:${item.id}`] = dp.widgetData
    if (dp?.pingStatus && item.href)
      swrFallback[`ping:${item.id}:${item.href}`] = dp.pingStatus
  }

  // Refresh ping statuses in background (fire-and-forget for next SSR)
  const pingItems = allItems.filter((item) => !item.serviceType && item.href)
  if (pingItems.length > 0) {
    Promise.all(
      pingItems.map((item) => pingAndCache(item.id, item.href!))
    ).catch((err) => console.error("[labitat] Background ping failed:", err))
  }

  return (
    <SWRFallbackProvider fallback={swrFallback}>
      <Dashboard
        groups={groupsWithItems}
        isLoggedIn={!!session.loggedIn}
        title={titleSetting?.value ?? "Labitat"}
      />
    </SWRFallbackProvider>
  )
}

export default function DashboardPage() {
  return (
    <Suspense fallback={<DashboardSkeleton />}>
      <DashboardContent />
    </Suspense>
  )
}
