"use server"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { revalidatePath } from "next/cache"

export async function updateDashboardTitle(title: string) {
  const session = await getSession()
  if (!session.loggedIn) {
    throw new Error("Unauthorized")
  }

  if (!title || typeof title !== "string") {
    throw new Error("Invalid title")
  }

  await db
    .insert(settings)
    .values({ key: "dashboardTitle", value: title })
    .onConflictDoUpdate({ target: settings.key, set: { value: title } })

  revalidatePath("/")
}
