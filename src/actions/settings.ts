"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { items, settings } from "@/lib/db/schema";
import { FEATURED_SERVICE_SETTING, serviceActivityKind } from "@/lib/service-activity";
import { refreshSettingCache } from "@/lib/structural-cache";

export async function updateDashboardTitle(title: string) {
  await requireAuth();

  const normalizedTitle = typeof title === "string" ? title.trim() : "";
  if (!normalizedTitle) {
    throw new Error("Invalid title");
  }

  await db
    .insert(settings)
    .values({ key: "dashboardTitle", value: normalizedTitle })
    .onConflictDoUpdate({ target: settings.key, set: { value: normalizedTitle } });

  await refreshSettingCache();
  try {
    revalidatePath("/");
  } catch {
    // Revalidation is unavailable in isolated unit tests; DB write remains authoritative.
  }
}

export async function updateFeaturedService(itemId: string | null) {
  await requireAuth();
  if (itemId !== null && (typeof itemId !== "string" || !itemId)) {
    throw new Error("Invalid featured service");
  }

  db.transaction(
    (tx) => {
      if (itemId === null) {
        tx.delete(settings).where(eq(settings.key, FEATURED_SERVICE_SETTING)).run();
        return;
      }

      const item = tx.select().from(items).where(eq(items.id, itemId)).get();
      if (!item || !serviceActivityKind(item.serviceType)) {
        throw new Error("Featured service must support downloads or streams");
      }
      tx.insert(settings)
        .values({ key: FEATURED_SERVICE_SETTING, value: item.id })
        .onConflictDoUpdate({ target: settings.key, set: { value: item.id } })
        .run();
    },
    { behavior: "immediate" },
  );
  revalidatePath("/");
}
