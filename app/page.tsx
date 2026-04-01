import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { fetchAllServiceData } from "@/actions/services"
import { Dashboard } from "@/components/dashboard/dashboard"

export default async function DashboardPage() {
  const [session, groupsWithItems, titleSetting] = await Promise.all([
    getSession(),
    db.query.groups.findMany({
      orderBy: (g, { asc }) => [asc(g.order)],
      with: {
        items: {
          orderBy: (i, { asc }) => [asc(i.order)],
        },
      },
    }),
    db.query.settings.findFirst({ where: eq(settings.key, "dashboardTitle") }),
  ])

  const title = titleSetting?.value ?? "Labitat"

  // Fetch initial service data for all items with a service type
  const itemIds = groupsWithItems
    .flatMap((g) => g.items)
    .filter((i) => i.serviceType)
    .map((i) => i.id)

  const initialServiceData = await fetchAllServiceData(itemIds)

  return (
    <Dashboard
      groups={groupsWithItems}
      isLoggedIn={!!session.loggedIn}
      title={title}
      initialServiceData={initialServiceData}
    />
  )
}
