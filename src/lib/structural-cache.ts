import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { getCachedAny, setCached } from "@/lib/cache"
import type { GroupWithItems } from "@/lib/types"

const GROUPS_KEY = "structural:groups"
const settingsKey = (key: string) => `structural:setting:${key}`

async function queryGroupsWithItems(): Promise<GroupWithItems[]> {
  return db.query.groups.findMany({
    orderBy: (g, { asc }) => [asc(g.order)],
    with: {
      items: {
        orderBy: (i, { asc }) => [asc(i.order)],
      },
    },
  })
}

/** Get groups from cache, seed from DB on cold start. */
export async function getOrSeedGroups(): Promise<GroupWithItems[]> {
  const cached = await getCachedAny<GroupWithItems[]>(GROUPS_KEY)
  if (cached) return cached

  const groups = await queryGroupsWithItems()
  await setCached(GROUPS_KEY, groups)
  return groups
}

/** Re-query DB and overwrite groups cache. Call after mutations. */
export async function refreshGroupsCache(): Promise<void> {
  const groups = await queryGroupsWithItems()
  await setCached(GROUPS_KEY, groups)
}

interface SettingRow {
  key: string
  value: string
}

/** Get a setting from cache, seed from DB on cold start. */
export async function getOrSeedSetting(
  key: string
): Promise<SettingRow | null> {
  const cacheKey = settingsKey(key)
  const cached = await getCachedAny<SettingRow>(cacheKey)
  if (cached) return cached

  const row = await db.query.settings.findFirst({
    where: eq(settings.key, key),
  })
  if (row) {
    await setCached(cacheKey, row)
  }
  return row ?? null
}

/** Write a setting value to cache. Call after mutations. */
export async function refreshSettingCache(
  key: string,
  value: string
): Promise<void> {
  await setCached(settingsKey(key), { key, value })
}
