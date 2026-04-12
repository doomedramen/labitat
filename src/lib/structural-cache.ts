import { eq } from "drizzle-orm"
import { db } from "@/lib/db"
import { settings } from "@/lib/db/schema"
import { setCached } from "@/lib/cache"
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
  setCached(GROUPS_KEY, groups)
  return groups
}

interface SettingRow {
  key: string
  value: string
}

/** Get a setting directly from DB — caching causes stale-data races in dev mode.
 *
 * Same issue as getOrSeedGroups: separate module contexts in Next.js dev mode
 * each hold their own memoryCache, so a reset + re-seed in one test can leave
 * stale setting values visible to the SSR worker.
 */
export async function getOrSeedSetting(
  key: string
): Promise<SettingRow | null> {
  const row = await db.query.settings.findFirst({
    where: eq(settings.key, key),
  })
  return row ?? null
}

/** Write a setting value to cache. Call after mutations. */
export async function refreshSettingCache(
  key: string,
  value: string
): Promise<void> {
  setCached(settingsKey(key), { key, value })
}
