"use server";
import { z } from "zod";
import { revalidatePath } from "next/cache";
import { requireAuth } from "@/lib/auth/guard";
import { commitLayout, readDashboardLayout, type DashboardLayout } from "@/lib/dashboard-layout";
import { pollingSup } from "@/lib/polling-supervisor";
const schema = z.object({
  baseRevision: z.number().int().nonnegative(),
  groups: z.array(z.object({ id: z.string().min(1), itemIds: z.array(z.string().min(1)) })),
});
export async function saveDashboardLayout(input: DashboardLayout) {
  await requireAuth();
  const result = commitLayout(schema.parse(input));
  if (result.status === "saved") {
    pollingSup.invalidateCache();
    revalidatePath("/");
  }
  return { status: result.status, ...readDashboardLayout() };
}
