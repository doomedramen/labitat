import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { getCachedAny, setCached, flushCache } from "@/lib/cache"
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

/** Get groups directly from DB — caching causes stale-data races in dev mode.
 *
 * Next.js dev server actions and SSR run in separate module contexts, each
 * with their own memoryCache. After a mutation, the server action refreshes
 * the file cache and returns fresh data, but the subsequent router.refresh()
 * re-render hits getCachedAny() which returns stale in-memory data from the
 * SSR worker's own memoryCache, overwriting the correct client state.
 *
 * The groups table is tiny (a handful of rows) so a direct query is cheap.
 */
export async function getOrSeedGroups(): Promise<GroupWithItems[]> {
  return queryGroupsWithItems()
}

/** Re-query DB and overwrite groups cache. Returns updated groups. */
export async function refreshGroupsCache(): Promise<GroupWithItems[]> {
  const groups = await queryGroupsWithItems()
  await setCached(GROUPS_KEY, groups)
  await flushCache()
  return groups
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
  await flushCache()
}
