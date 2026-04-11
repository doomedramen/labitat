"use server"

import { eq, max } from "drizzle-orm"
import { nanoid } from "nanoid"
import { requireAuth } from "@/lib/auth/guard"
import { db } from "@/lib/db"
import { groups } from "@/lib/db/schema"
import { refreshGroupsCache } from "@/lib/structural-cache"

export async function createGroup(formData: FormData) {
  await requireAuth()

  const name = (formData.get("name") as string | null)?.trim() ?? ""

  const [result] = await db.select({ maxOrder: max(groups.order) }).from(groups)
  const nextOrder = (result?.maxOrder ?? -1) + 1

  await db.insert(groups).values({ id: nanoid(), name, order: nextOrder })
  await refreshGroupsCache()
}

export async function updateGroup(id: string, formData: FormData) {
  await requireAuth()

  const name = (formData.get("name") as string | null)?.trim() ?? ""

  await db.update(groups).set({ name }).where(eq(groups.id, id))
  await refreshGroupsCache()
}

export async function deleteGroup(id: string) {
  await requireAuth()
  await db.delete(groups).where(eq(groups.id, id))
  await refreshGroupsCache()
}

export async function reorderGroups(orderedIds: string[]) {
  await requireAuth()
  await Promise.all(
    orderedIds.map((id, index) =>
      db.update(groups).set({ order: index }).where(eq(groups.id, id))
    )
  )
  await refreshGroupsCache()
}
