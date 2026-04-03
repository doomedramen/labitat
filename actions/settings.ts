"use server"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { VALID_PALETTE_IDS } from "@/lib/palettes"
import { revalidatePath } from "next/cache"

export async function updatePalette(palette: string) {
  const session = await getSession()
  if (!session.loggedIn) throw new Error("Unauthorized")

  if (!VALID_PALETTE_IDS.includes(palette)) {
    throw new Error(
      `Invalid palette. Valid options: ${VALID_PALETTE_IDS.join(", ")}`
    )
  }

  await db
    .insert(settings)
    .values({ key: "palette", value: palette })
    .onConflictDoUpdate({ target: settings.key, set: { value: palette } })

  revalidatePath("/")
}

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
