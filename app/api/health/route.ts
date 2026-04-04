import { NextResponse } from "next/server"
import { db } from "@/lib/db"
import { users } from "@/lib/db/schema"

export async function GET() {
  try {
    await db.select({ id: users.id }).from(users).limit(1)
    return NextResponse.json({ status: "ok" })
  } catch {
    return NextResponse.json(
      { status: "error", message: "Database unreachable" },
      { status: 503 }
    )
  }
}
