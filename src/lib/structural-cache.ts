import { eq } from "drizzle-orm";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
import type { GroupWithItems } from "@/lib/types";

async function queryGroupsWithItems(): Promise<GroupWithItems[]> {
  const groupsWithItems = await db.query.groups.findMany({
    orderBy: (g, { asc }) => [asc(g.order)],
    with: {
      items: {
        orderBy: (i, { asc }) => [asc(i.order)],
      },
    },
  });

  return groupsWithItems.map((group) => ({
    ...group,
    items: group.items.map((item) => ({
      ...item,
      // Ensure this field crosses the RSC boundary reliably. Some runtimes surface JSON
      // columns as non-plain objects; serializing to a JSON string keeps it stable.
      statCardOrder:
        item.statCardOrder === null || item.statCardOrder === undefined
          ? null
          : typeof item.statCardOrder === "string"
            ? item.statCardOrder
            : JSON.stringify(item.statCardOrder),
    })),
  }));
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
  return queryGroupsWithItems();
}

/** Re-query DB and overwrite groups cache. Returns updated groups. */
export async function refreshGroupsCache(): Promise<GroupWithItems[]> {
  return queryGroupsWithItems();
}

interface SettingRow {
  key: string;
  value: string;
}

/** Get a setting directly from DB — caching causes stale-data races in dev mode.
 *
 * Same issue as getOrSeedGroups: separate module contexts in Next.js dev mode
 * each hold their own memoryCache, so a reset + re-seed in one test can leave
 * stale setting values visible to the SSR worker.
 */
export async function getOrSeedSetting(key: string): Promise<SettingRow | null> {
  const row = await db.query.settings.findFirst({
    where: eq(settings.key, key),
  });
  return row ?? null;
}

/** Write a setting value to cache. Call after mutations. */
export async function refreshSettingCache(): Promise<void> {
  // No-op — settings are read directly from DB
}
