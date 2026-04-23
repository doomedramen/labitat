import { NextResponse } from "next/server";
import { env } from "@/lib/env";

export async function POST(request: Request) {
  const secret = request.headers.get("x-test-secret");
  if (!env.TEST_SECRET || secret !== env.TEST_SECRET) {
    return NextResponse.json({ error: "Not found" }, { status: 404 });
  }

  // Dynamic imports to avoid loading env-dependent modules during build
  const { db } = await import("@/lib/db");
  const { sql } = await import("drizzle-orm");
  const { resetAllRateLimits } = await import("@/lib/auth/rate-limit");
  const { serverCache } = await import("@/lib/server-cache");

  // Delete in FK dependency order
  await db.run(sql`DELETE FROM items`);
  await db.run(sql`DELETE FROM groups`);
  await db.run(sql`DELETE FROM settings`);
  await db.run(sql`DELETE FROM users`);

  resetAllRateLimits();

  // Clear server cache to prevent stale data leaking between tests
  serverCache.clear();

  return NextResponse.json({ ok: true });
}
