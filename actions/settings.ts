"use server"

import { getSession } from "@/lib/auth"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { revalidatePath } from "next/cache"

const VALID_PALETTES = [
  "default",
  "nord",
  "catppuccin",
  "gruvbox",
  "amoled",
  "dracula",
  "one-dark",
  "solarized",
  "tokyo-night",
  "monokai",
  "dawn",
]

export async function updatePalette(palette: string) {
  const session = await getSession()
  if (!session.loggedIn) throw new Error("Unauthorized")

  if (!VALID_PALETTES.includes(palette)) {
    throw new Error(
      `Invalid palette. Valid options: ${VALID_PALETTES.join(", ")}`
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
