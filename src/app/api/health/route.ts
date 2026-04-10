import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { sql } from "drizzle-orm"

export async function GET() {
  try {
    await db.get<{ result: number }>(sql`SELECT 1 AS result`)
    return NextResponse.json({ status: "ok", db: "connected" })
  } catch (err) {
    return NextResponse.json(
      { status: "error", db: "unreachable", error: String(err) },
      { status: 503 }
    )
  }
}
