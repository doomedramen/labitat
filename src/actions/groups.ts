"use server";

import { eq, max } from "drizzle-orm";
import { nanoid } from "nanoid";
import { requireAuth } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { groups, items } from "@/lib/db/schema";
import { refreshGroupsCache } from "@/lib/structural-cache";
import type { GroupWithItems } from "@/lib/types";

export async function createGroup(formData: FormData): Promise<GroupWithItems[]> {
  await requireAuth();

  const name = (formData.get("name") as string | null)?.trim() ?? "";

  const [result] = await db.select({ maxOrder: max(groups.order) }).from(groups);
  const nextOrder = (result?.maxOrder ?? -1) + 1;

  await db.insert(groups).values({ id: nanoid(), name, order: nextOrder });
  return refreshGroupsCache();
}

export async function updateGroup(id: string, formData: FormData): Promise<GroupWithItems[]> {
  await requireAuth();

  const name = (formData.get("name") as string | null)?.trim() ?? "";

  await db.update(groups).set({ name }).where(eq(groups.id, id));
  return refreshGroupsCache();
}

export async function deleteGroup(id: string): Promise<GroupWithItems[]> {
  await requireAuth();
  // Explicitly delete items first — ON DELETE CASCADE is schema-level but
  // SQLite requires foreign_keys=ON per-connection for it to fire, and
  // some module instances in dev may not have it set.
  await db.delete(items).where(eq(items.groupId, id));
  await db.delete(groups).where(eq(groups.id, id));
  return refreshGroupsCache();
}

export async function reorderGroups(orderedIds: string[]): Promise<GroupWithItems[]> {
  await requireAuth();
  await Promise.all(
    orderedIds.map((id, index) => db.update(groups).set({ order: index }).where(eq(groups.id, id))),
  );
  return refreshGroupsCache();
}
