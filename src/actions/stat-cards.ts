"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { requireAuth } from "@/lib/auth/guard";
import { db } from "@/lib/db";
import { items } from "@/lib/db/schema";
import type { StatCardOrder } from "@/hooks/use-stat-card-order";

export async function updateStatCardOrder(itemId: string, order: StatCardOrder | null) {
  await requireAuth();

  await db.update(items).set({ statCardOrder: order }).where(eq(items.id, itemId));
  revalidatePath("/");
}
