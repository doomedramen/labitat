import { NextResponse } from "next/server"
import { sql } from "drizzle-orm"
import { db } from "@/lib/db"
import { resetAllRateLimits } from "@/lib/auth/rate-limit"
import { serverCache } from "@/lib/server-cache"

export async function POST(request: Request) {
  if (process.env.NODE_ENV === "production") {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }
  const secret = request.headers.get("x-test-secret")
  if (!process.env.TEST_SECRET || secret !== process.env.TEST_SECRET) {
    return NextResponse.json({ error: "Not found" }, { status: 404 })
  }

  // Delete in FK dependency order
  await db.run(sql`DELETE FROM items`)
  await db.run(sql`DELETE FROM groups`)
  await db.run(sql`DELETE FROM settings`)
  await db.run(sql`DELETE FROM users`)

  resetAllRateLimits()

  // Clear server cache to prevent stale data leaking between tests
  serverCache.clear()

  return NextResponse.json({ ok: true })
}
