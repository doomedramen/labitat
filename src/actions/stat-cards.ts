"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import type { StatCardOrder } from "@/hooks/use-stat-card-order";

function safeRevalidatePath(path: string) {
  try {
    revalidatePath(path);
  } catch {
    // Best-effort; may be unavailable in unit tests.
  }
}

export async function updateStatCardOrder(itemId: string, order: StatCardOrder | null) {
  await requireAuth();

  await db
    .update(items)
    .set({ statCardOrder: order ? JSON.stringify(order) : null })
    .where(eq(items.id, itemId));
  safeRevalidatePath("/");
  safeRevalidatePath("/edit");
}
