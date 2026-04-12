import { NextResponse } from "next/server"

export async function GET() {
  try {
    // Dynamic imports to avoid loading env-dependent modules during build
    const { db } = await import("@/lib/db")
    const { sql } = await import("drizzle-orm")
    await db.get<{ result: number }>(sql`SELECT 1 AS result`)
    return NextResponse.json({ status: "ok", db: "connected" })
  } catch (err) {
    return NextResponse.json(
      { status: "error", db: "unreachable", error: String(err) },
      { status: 503 }
    )
  }
}
