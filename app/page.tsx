import { Suspense } from "react"
import { eq } from "drizzle-orm"
import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { Dashboard } from "@/components/dashboard/dashboard"
import { DashboardSkeleton } from "@/components/dashboard/skeleton"

// Revalidate every 60 seconds - serves cached HTML instantly
export const revalidate = 60

async function DashboardContent() {
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

  return (
    <Dashboard
      groups={groupsWithItems}
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
