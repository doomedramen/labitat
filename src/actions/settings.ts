"use server";

import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { settings } from "@/lib/db/schema";
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
